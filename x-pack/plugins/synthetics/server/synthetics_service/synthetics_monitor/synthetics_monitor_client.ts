/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  KibanaRequest,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindResult,
} from '@kbn/core/server';
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
  EncryptedSyntheticsMonitor,
  HeartbeatConfig,
  MonitorFields,
  MonitorServiceLocation,
  PrivateLocation,
  SyntheticsMonitorWithId,
  SyntheticsMonitorWithSecrets,
} from '../../../common/runtime_types';
import {
  ConfigData,
  formatHeartbeatRequest,
  mixParamsWithGlobalParams,
} from '../formatters/public_formatters/format_configs';

export class SyntheticsMonitorClient {
  public syntheticsService: SyntheticsService;
  public privateLocationAPI: SyntheticsPrivateLocation;

  constructor(syntheticsService: SyntheticsService, server: SyntheticsServerSetup) {
    this.syntheticsService = syntheticsService;
    this.privateLocationAPI = new SyntheticsPrivateLocation(server);
  }

  async addMonitors(
    monitors: Array<{ monitor: MonitorFields; id: string }>,
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract,
    allPrivateLocations: PrivateLocation[],
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
      request,
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
      previousMonitor: SavedObject<EncryptedSyntheticsMonitor>;
      decryptedPreviousMonitor: SavedObject<SyntheticsMonitorWithSecrets>;
    }>,
    routeContext: RouteContext,
    allPrivateLocations: PrivateLocation[],
    spaceId: string
  ) {
    const { request } = routeContext;
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
        deletedPublicConfigs.push({ ...deletedPublicConfig, params: paramsBySpace[spaceId] });
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
      request,
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
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract,
    spaceId: string
  ) {
    const privateDeletePromise = this.privateLocationAPI.deleteMonitors(monitors, request, spaceId);

    const publicDeletePromise = this.syntheticsService.deleteConfigs(
      monitors.map((monitor) => ({ monitor, configId: monitor.config_id, params: {} }))
    );
    const [pubicResponse] = await Promise.all([publicDeletePromise, privateDeletePromise]);

    return pubicResponse;
  }

  hasPrivateLocations(previousMonitor: SavedObject<EncryptedSyntheticsMonitor>) {
    const { locations } = previousMonitor.attributes;

    return locations.some((loc) => !loc.isServiceManaged);
  }

  hasDeletedPublicLocations(
    updatedLocations: MonitorServiceLocation[],
    decryptedPreviousMonitor: SavedObject<SyntheticsMonitorWithSecrets>
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
    request,
    spaceId,
    savedObjectsClient,
    allPrivateLocations,
    encryptedSavedObjects,
  }: {
    spaceId: string;
    request: KibanaRequest;
    allPrivateLocations: PrivateLocation[];
    savedObjectsClient: SavedObjectsClientContract;
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
        publicConfigs.push({ monitor, configId: monitor.config_id, params: {} });
      }

      if (privateLocations.length > 0) {
        privateConfigs.push({ config: monitor, globalParams: paramsBySpace[monitor.namespace] });
      }
    }
    if (privateConfigs.length > 0) {
      await this.privateLocationAPI.editMonitors(
        privateConfigs,
        request,
        allPrivateLocations,
        spaceId
      );
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

    const monitors: Array<SavedObjectsFindResult<SyntheticsMonitorWithSecrets>> = [];

    const finder =
      await encryptedClient.createPointInTimeFinderDecryptedAsInternalUser<SyntheticsMonitorWithSecrets>(
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
    monitors: Array<SavedObjectsFindResult<SyntheticsMonitorWithSecrets>>,
    paramsBySpace: Record<string, Record<string, string>>
  ) {
    const heartbeatConfigs: HeartbeatConfig[] = [];

    for (const monitor of monitors) {
      const attributes = monitor.attributes as unknown as MonitorFields;
      const { str: paramsString } = mixParamsWithGlobalParams(paramsBySpace[spaceId], attributes);

      heartbeatConfigs.push(
        formatHeartbeatRequest(
          {
            monitor: normalizeSecrets(monitor).attributes,
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
    allPrivateLocations: PrivateLocation[],
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
