/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObject, SavedObjectsClientContract, SavedObjectsFindResult } from '@kbn/core/server';
import { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import { RouteContext } from '../../routes/types';
import { SyntheticsServerSetup } from '../../types';
import { syntheticsMonitorType } from '../../../common/types/saved_objects';
import { normalizeSecrets } from '../utils';
import {
  PrivateConfig,
  SyntheticsPrivateLocation,
} from '../private_location/synthetics_private_location';
import { SyntheticsService } from '../synthetics_service';
import {
  ConfigKey,
  EncryptedSyntheticsMonitorAttributes,
  HeartbeatConfig,
  MonitorFields,
  MonitorServiceLocation,
  ScheduleUnit,
  SyntheticsMonitorWithId,
  SyntheticsMonitorWithSecretsAttributes,
} from '../../../common/runtime_types';
import {
  ConfigData,
  formatHeartbeatRequest,
  mixParamsWithGlobalParams,
} from '../formatters/public_formatters/format_configs';
import type { PrivateLocationAttributes } from '../../runtime_types/private_locations';
export const LIGHTWEIGHT_TEST_NOW_RUN = 'LIGHTWEIGHT_SYNTHETICS_TEST_NOW_RUN';
export const BROWSER_TEST_NOW_RUN = 'BROWSER_SYNTHETICS_TEST_NOW_RUN';
const LONG_TIME_MONTH = '43800';

export class SyntheticsMonitorClient {
  public server: SyntheticsServerSetup;
  public syntheticsService: SyntheticsService;
  public privateLocationAPI: SyntheticsPrivateLocation;

  constructor(syntheticsService: SyntheticsService, server: SyntheticsServerSetup) {
    this.server = server;
    this.syntheticsService = syntheticsService;
    this.privateLocationAPI = new SyntheticsPrivateLocation(server);
  }

  async addMonitors(
    monitors: Array<{ monitor: MonitorFields; id: string }>,
    savedObjectsClient: SavedObjectsClientContract,
    allPrivateLocations: PrivateLocationAttributes[],
    spaceId: string
  ) {
    const privateConfigs: PrivateConfig[] = [];
    const publicConfigs: ConfigData[] = [];

    const paramsBySpace = await this.syntheticsService.getSyntheticsParams({ spaceId });

    for (const monitorObj of monitors) {
      const { formattedConfig, params, config } = await this.formatConfigWithParams(
        monitorObj,
        spaceId,
        paramsBySpace
      );

      const { privateLocations, publicLocations } = this.parseLocations(formattedConfig);
      if (privateLocations.length > 0) {
        privateConfigs.push({ config: formattedConfig, globalParams: params });
      }

      if (publicLocations.length > 0) {
        publicConfigs.push(config);
      }
    }

    const newPolicies = this.privateLocationAPI.createPackagePolicies(
      privateConfigs,
      allPrivateLocations,
      spaceId
    );

    const syncErrors = this.syntheticsService.addConfigs(publicConfigs);

    return await Promise.all([newPolicies, syncErrors]);
  }

  async editMonitors(
    monitors: Array<{
      monitor: MonitorFields;
      id: string;
      previousMonitor: SavedObject<EncryptedSyntheticsMonitorAttributes>;
      decryptedPreviousMonitor: SavedObject<SyntheticsMonitorWithSecretsAttributes>;
    }>,
    routeContext: RouteContext,
    allPrivateLocations: PrivateLocationAttributes[],
    spaceId: string
  ) {
    const privateConfigs: Array<{ config: HeartbeatConfig; globalParams: Record<string, string> }> =
      [];

    const publicConfigs: ConfigData[] = [];
    const deletedPublicConfigs: ConfigData[] = [];

    const paramsBySpace = await this.syntheticsService.getSyntheticsParams({ spaceId });

    for (const editedMonitor of monitors) {
      const { str: paramsString, params } = mixParamsWithGlobalParams(
        paramsBySpace[spaceId],
        editedMonitor.monitor
      );

      const configData = {
        spaceId,
        params: paramsBySpace[spaceId],
        monitor: editedMonitor.monitor,
        configId: editedMonitor.id,
      };

      const editedConfig = formatHeartbeatRequest(configData, paramsString);
      const { publicLocations, privateLocations } = this.parseLocations(editedConfig);
      if (publicLocations.length > 0) {
        publicConfigs.push(configData);
      }

      const deletedPublicConfig = this.hasDeletedPublicLocations(
        publicLocations,
        editedMonitor.decryptedPreviousMonitor
      );

      if (deletedPublicConfig) {
        deletedPublicConfigs.push({
          ...deletedPublicConfig,
          params: paramsBySpace[spaceId],
          spaceId,
        });
      }

      if (privateLocations.length > 0 || this.hasPrivateLocations(editedMonitor.previousMonitor)) {
        privateConfigs.push({ config: editedConfig, globalParams: params });
      }
    }

    if (deletedPublicConfigs.length > 0) {
      await this.syntheticsService.deleteConfigs(deletedPublicConfigs);
    }

    const privateEditPromise = this.privateLocationAPI.editMonitors(
      privateConfigs,
      allPrivateLocations,
      spaceId
    );

    const publicConfigsPromise = this.syntheticsService.editConfig(publicConfigs);

    const [publicSyncErrors, privateEditResponse] = await Promise.all([
      publicConfigsPromise,
      privateEditPromise,
    ]);

    const { failedUpdates: failedPolicyUpdates } = privateEditResponse;

    return { failedPolicyUpdates, publicSyncErrors };
  }
  async deleteMonitors(
    monitors: SyntheticsMonitorWithId[],
    savedObjectsClient: SavedObjectsClientContract,
    spaceId: string
  ) {
    const privateDeletePromise = this.privateLocationAPI.deleteMonitors(monitors, spaceId);

    const publicDeletePromise = this.syntheticsService.deleteConfigs(
      monitors.map((monitor) => ({ spaceId, monitor, configId: monitor.config_id, params: {} }))
    );
    const [pubicResponse] = await Promise.all([publicDeletePromise, privateDeletePromise]);

    return pubicResponse;
  }

  async testNowConfigs(
    monitor: { monitor: MonitorFields; id: string; testRunId: string },
    savedObjectsClient: SavedObjectsClientContract,
    allPrivateLocations: PrivateLocationAttributes[],
    spaceId: string,
    runOnce?: true
  ) {
    let privateConfig: PrivateConfig | undefined;
    let publicConfig: ConfigData | undefined;

    const paramsBySpace = await this.syntheticsService.getSyntheticsParams({ spaceId });

    const { formattedConfig, params, config } = await this.formatConfigWithParams(
      monitor,
      spaceId,
      paramsBySpace
    );

    const { privateLocations, publicLocations } = this.parseLocations(formattedConfig);
    if (privateLocations.length > 0) {
      privateConfig = {
        config: {
          ...formattedConfig,
          [ConfigKey.SCHEDULE]: {
            number: LONG_TIME_MONTH,
            unit: ScheduleUnit.MINUTES,
          },
          [ConfigKey.ENABLED]: true,
        },
        globalParams: params,
      };
    }

    if (publicLocations.length > 0) {
      publicConfig = config;
      // making it enabled, even if it's disabled in the UI
      publicConfig.monitor.enabled = true;
      publicConfig.testRunId = monitor.testRunId;
      if (runOnce) {
        publicConfig.runOnce = true;
      }
    }

    const newPolicies = this.privateLocationAPI.createPackagePolicies(
      privateConfig ? [privateConfig] : [],
      allPrivateLocations,
      spaceId,
      monitor.testRunId,
      runOnce
    );

    const syncErrors = this.syntheticsService.runOnceConfigs(publicConfig);

    return await Promise.all([newPolicies, syncErrors]);
  }

  hasPrivateLocations(previousMonitor: SavedObject<EncryptedSyntheticsMonitorAttributes>) {
    const { locations } = previousMonitor.attributes;

    return locations.some((loc) => !loc.isServiceManaged);
  }

  hasDeletedPublicLocations(
    updatedLocations: MonitorServiceLocation[],
    decryptedPreviousMonitor: SavedObject<SyntheticsMonitorWithSecretsAttributes>
  ) {
    const { locations } = decryptedPreviousMonitor.attributes;

    const prevPublicLocations = locations.filter((loc) => loc.isServiceManaged);

    const missingPublicLocations = prevPublicLocations.filter((prevLoc) => {
      return !updatedLocations.some((updatedLoc) => updatedLoc.id === prevLoc.id);
    });
    if (missingPublicLocations.length > 0) {
      const { attributes: normalizedPreviousMonitor } = normalizeSecrets(decryptedPreviousMonitor);
      normalizedPreviousMonitor.locations = missingPublicLocations;

      return {
        monitor: normalizedPreviousMonitor,
        configId: decryptedPreviousMonitor.id,
      };
    }
  }

  parseLocations(config: HeartbeatConfig) {
    const { locations } = config;

    const privateLocations = locations.filter((loc) => !loc.isServiceManaged);
    const publicLocations = locations.filter((loc) => loc.isServiceManaged);

    return { privateLocations, publicLocations };
  }

  async syncGlobalParams({
    spaceId,
    allPrivateLocations,
    encryptedSavedObjects,
  }: {
    spaceId: string;
    allPrivateLocations: PrivateLocationAttributes[];
    encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  }) {
    const privateConfigs: Array<{ config: HeartbeatConfig; globalParams: Record<string, string> }> =
      [];
    const publicConfigs: ConfigData[] = [];

    const { allConfigs: monitors, paramsBySpace } = await this.getAllMonitorConfigs({
      encryptedSavedObjects,
      spaceId,
    });

    for (const monitor of monitors) {
      const { publicLocations, privateLocations } = this.parseLocations(monitor);
      if (publicLocations.length > 0) {
        publicConfigs.push({ spaceId, monitor, configId: monitor.config_id, params: {} });
      }

      if (privateLocations.length > 0) {
        privateConfigs.push({ config: monitor, globalParams: paramsBySpace[monitor.namespace] });
      }
    }
    if (privateConfigs.length > 0) {
      await this.privateLocationAPI.editMonitors(privateConfigs, allPrivateLocations, spaceId);
    }

    if (publicConfigs.length > 0) {
      return await this.syntheticsService.editConfig(publicConfigs, false);
    }
  }

  async getAllMonitorConfigs({
    spaceId,
    encryptedSavedObjects,
  }: {
    spaceId: string;
    encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  }) {
    const paramsBySpacePromise = this.syntheticsService.getSyntheticsParams({ spaceId });

    const monitorsPromise = this.getAllMonitors({ encryptedSavedObjects, spaceId });

    const [paramsBySpace, monitors] = await Promise.all([paramsBySpacePromise, monitorsPromise]);

    return {
      allConfigs: this.mixParamsWithMonitors(spaceId, monitors, paramsBySpace),
      paramsBySpace,
    };
  }

  async getAllMonitors({
    spaceId,
    encryptedSavedObjects,
  }: {
    spaceId: string;
    encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  }) {
    const encryptedClient = encryptedSavedObjects.getClient();

    const monitors: Array<SavedObjectsFindResult<SyntheticsMonitorWithSecretsAttributes>> = [];

    const finder =
      await encryptedClient.createPointInTimeFinderDecryptedAsInternalUser<SyntheticsMonitorWithSecretsAttributes>(
        {
          type: syntheticsMonitorType,
          perPage: 1000,
          namespaces: [spaceId],
        }
      );

    for await (const response of finder.find()) {
      response.saved_objects.forEach((monitor) => {
        monitors.push(monitor);
      });
    }

    // no need to wait here
    finder.close();

    return monitors;
  }

  mixParamsWithMonitors(
    spaceId: string,
    monitors: Array<SavedObjectsFindResult<SyntheticsMonitorWithSecretsAttributes>>,
    paramsBySpace: Record<string, Record<string, string>>
  ) {
    const heartbeatConfigs: HeartbeatConfig[] = [];

    for (const monitor of monitors) {
      const normalizedMonitor = normalizeSecrets(monitor).attributes as MonitorFields;
      const { str: paramsString } = mixParamsWithGlobalParams(
        paramsBySpace[spaceId],
        normalizedMonitor
      );

      heartbeatConfigs.push(
        formatHeartbeatRequest(
          {
            spaceId,
            monitor: normalizedMonitor,
            configId: monitor.id,
          },
          paramsString
        )
      );
    }

    return heartbeatConfigs;
  }

  async formatConfigWithParams(
    monitorObj: { monitor: MonitorFields; id: string },
    spaceId: string,
    paramsBySpace: Record<string, Record<string, string>>
  ) {
    const { monitor, id } = monitorObj;
    const config = {
      spaceId,
      monitor,
      configId: id,
      params: paramsBySpace[spaceId],
    };

    const { str: paramsString, params } = mixParamsWithGlobalParams(
      paramsBySpace[spaceId],
      monitor
    );

    const formattedConfig = formatHeartbeatRequest(config, paramsString);
    return { formattedConfig, params, config };
  }

  async inspectMonitor(
    monitorObj: { monitor: MonitorFields; id: string },
    allPrivateLocations: PrivateLocationAttributes[],
    spaceId: string,
    hideParams: boolean,
    canSave: boolean
  ) {
    const privateConfigs: PrivateConfig[] = [];
    const paramsBySpace = await this.syntheticsService.getSyntheticsParams({
      spaceId,
      canSave,
      hideParams,
    });

    const { formattedConfig, params, config } = await this.formatConfigWithParams(
      monitorObj,
      spaceId,
      paramsBySpace
    );

    if (hideParams) {
      formattedConfig.params = hideParamsHelper(formattedConfig.params);
      config.monitor.params = hideParamsHelper(config.monitor.params);
    }

    const { privateLocations, publicLocations } = this.parseLocations(formattedConfig);
    if (privateLocations.length > 0) {
      privateConfigs.push({ config: formattedConfig, globalParams: params });
    }

    const publicPromise = this.syntheticsService.inspectConfig(
      publicLocations.length > 0 ? config : undefined
    );
    const privatePromise = this.privateLocationAPI.inspectPackagePolicy({
      privateConfig: privateConfigs?.[0],
      allPrivateLocations,
      spaceId,
    });

    const [publicConfigs, privateConfig] = await Promise.all([publicPromise, privatePromise]);
    return { publicConfigs, privateConfig };
  }
}

const hideParamsHelper = (params?: string) => {
  if (!params) return params;

  const parsedParams = JSON.parse(params);
  // replace all values with '***'
  const newParams = Object.create(null);
  Object.keys(parsedParams).forEach((key) => {
    newParams[key] = '"********"';
  });

  return JSON.stringify(newParams);
};
