/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IClusterClient } from '../../../../../src/core/server/elasticsearch/client/cluster_client';
import type { IScopedClusterClient } from '../../../../../src/core/server/elasticsearch/client/scoped_cluster_client';
import { KibanaRequest } from '../../../../../src/core/server/http/router/request';
import type { SavedObjectsClientContract } from '../../../../../src/core/server/saved_objects/types';
import type { UiSettingsServiceStart } from '../../../../../src/core/server/ui_settings/types';
import type { FieldFormatsStart } from '../../../../../src/plugins/field_formats/server/types';
import type { CloudSetup } from '../../../cloud/server/plugin';
import type { SecurityPluginSetup } from '../../../security/server/plugin';
import type { SpacesPluginStart } from '../../../spaces/server/plugin';
import { MlLicense } from '../../common/license/ml_license';
import type { MlCapabilitiesKey, ResolveMlCapabilities } from '../../common/types/capabilities';
import type { FieldFormatsRegistryProvider } from '../../common/types/kibana';
import type { JobsHealthServiceProvider } from '../lib/alerts/jobs_health_service';
import { getJobsHealthServiceProvider } from '../lib/alerts/jobs_health_service';
import type { HasMlCapabilities } from '../lib/capabilities/check_capabilities';
import { hasMlCapabilitiesProvider } from '../lib/capabilities/check_capabilities';
import { getMlClient } from '../lib/ml_client/ml_client';
import type { MlClient } from '../lib/ml_client/types';
import type { JobSavedObjectService } from '../saved_objects/service';
import { jobSavedObjectServiceFactory } from '../saved_objects/service';
import {
  MLClusterClientUninitialized,
  MLFieldFormatRegistryUninitialized,
  MLUISettingsClientUninitialized,
} from './errors';
import { licenseChecks } from './license_checks/license_checks';
import type { MlAlertingServiceProvider } from './providers/alerting_service';
import { getAlertingServiceProvider } from './providers/alerting_service';
import type { AnomalyDetectorsProvider } from './providers/anomaly_detectors';
import { getAnomalyDetectorsProvider } from './providers/anomaly_detectors';
import type { JobServiceProvider } from './providers/job_service';
import { getJobServiceProvider } from './providers/job_service';
import type { ModulesProvider } from './providers/modules';
import { getModulesProvider } from './providers/modules';
import type { ResultsServiceProvider } from './providers/results_service';
import { getResultsServiceProvider } from './providers/results_service';
import type { MlSystemProvider } from './providers/system';
import { getMlSystemProvider } from './providers/system';

export type SharedServices = JobServiceProvider &
  AnomalyDetectorsProvider &
  MlSystemProvider &
  ModulesProvider &
  ResultsServiceProvider &
  MlAlertingServiceProvider;

export type MlServicesProviders = JobsHealthServiceProvider;

interface Guards {
  isMinimumLicense(): Guards;
  isFullLicense(): Guards;
  hasMlCapabilities: (caps: MlCapabilitiesKey[]) => Guards;
  ok(callback: OkCallback): any;
}

export type GetGuards = (
  request: KibanaRequest,
  savedObjectsClient: SavedObjectsClientContract
) => Guards;

export interface SharedServicesChecks {
  getGuards(request: KibanaRequest): Guards;
}

interface OkParams {
  scopedClient: IScopedClusterClient;
  mlClient: MlClient;
  jobSavedObjectService: JobSavedObjectService;
  getFieldsFormatRegistry: FieldFormatsRegistryProvider;
}

type OkCallback = (okParams: OkParams) => any;

export function createSharedServices(
  mlLicense: MlLicense,
  getSpaces: (() => Promise<SpacesPluginStart>) | undefined,
  cloud: CloudSetup,
  authorization: SecurityPluginSetup['authz'] | undefined,
  resolveMlCapabilities: ResolveMlCapabilities,
  getClusterClient: () => IClusterClient | null,
  getInternalSavedObjectsClient: () => SavedObjectsClientContract | null,
  getUiSettings: () => UiSettingsServiceStart | null,
  getFieldsFormat: () => FieldFormatsStart | null,
  isMlReady: () => Promise<void>
): {
  sharedServicesProviders: SharedServices;
  internalServicesProviders: MlServicesProviders;
} {
  const { isFullLicense, isMinimumLicense } = licenseChecks(mlLicense);
  function getGuards(
    request: KibanaRequest,
    savedObjectsClient: SavedObjectsClientContract
  ): Guards {
    const internalSavedObjectsClient = getInternalSavedObjectsClient();
    if (internalSavedObjectsClient === null) {
      throw new Error('Internal saved object client not initialized');
    }
    const getRequestItems = getRequestItemsProvider(
      resolveMlCapabilities,
      getClusterClient,
      savedObjectsClient,
      internalSavedObjectsClient,
      authorization,
      getSpaces !== undefined,
      isMlReady,
      getUiSettings,
      getFieldsFormat
    );

    const {
      hasMlCapabilities,
      scopedClient,
      mlClient,
      jobSavedObjectService,
      getFieldsFormatRegistry,
    } = getRequestItems(request);
    const asyncGuards: Array<Promise<void>> = [];

    const guards: Guards = {
      isMinimumLicense: () => {
        isMinimumLicense();
        return guards;
      },
      isFullLicense: () => {
        isFullLicense();
        return guards;
      },
      hasMlCapabilities: (caps: MlCapabilitiesKey[]) => {
        asyncGuards.push(hasMlCapabilities(caps));
        return guards;
      },
      async ok(callback: OkCallback) {
        await Promise.all(asyncGuards);
        return callback({ scopedClient, mlClient, jobSavedObjectService, getFieldsFormatRegistry });
      },
    };
    return guards;
  }

  return {
    /**
     * Exposed providers for shared services used by other plugins
     */
    sharedServicesProviders: {
      ...getJobServiceProvider(getGuards),
      ...getAnomalyDetectorsProvider(getGuards),
      ...getModulesProvider(getGuards),
      ...getResultsServiceProvider(getGuards),
      ...getMlSystemProvider(getGuards, mlLicense, getSpaces, cloud, resolveMlCapabilities),
      ...getAlertingServiceProvider(getGuards),
    },
    /**
     * Services providers for ML internal usage
     */
    internalServicesProviders: {
      ...getJobsHealthServiceProvider(getGuards),
    },
  };
}

function getRequestItemsProvider(
  resolveMlCapabilities: ResolveMlCapabilities,
  getClusterClient: () => IClusterClient | null,
  savedObjectsClient: SavedObjectsClientContract,
  internalSavedObjectsClient: SavedObjectsClientContract,
  authorization: SecurityPluginSetup['authz'] | undefined,
  spaceEnabled: boolean,
  isMlReady: () => Promise<void>,
  getUiSettings: () => UiSettingsServiceStart | null,
  getFieldsFormat: () => FieldFormatsStart | null
) {
  return (request: KibanaRequest) => {
    const getHasMlCapabilities = hasMlCapabilitiesProvider(resolveMlCapabilities);
    let hasMlCapabilities: HasMlCapabilities;
    let scopedClient: IScopedClusterClient;
    let mlClient: MlClient;
    // While https://github.com/elastic/kibana/issues/64588 exists we
    // will not receive a real request object when being called from an alert.
    // instead a dummy request object will be supplied
    const clusterClient = getClusterClient();
    const jobSavedObjectService = jobSavedObjectServiceFactory(
      savedObjectsClient,
      internalSavedObjectsClient,
      spaceEnabled,
      authorization,
      isMlReady
    );

    if (clusterClient === null) {
      throw new MLClusterClientUninitialized(`ML's cluster client has not been initialized`);
    }

    const uiSettingsClient = getUiSettings()?.asScopedToClient(savedObjectsClient);
    if (!uiSettingsClient) {
      throw new MLUISettingsClientUninitialized(`ML's UI settings client has not been initialized`);
    }

    const getFieldsFormatRegistry = async () => {
      let fieldFormatRegistry;
      try {
        fieldFormatRegistry = await getFieldsFormat()!.fieldFormatServiceFactory(uiSettingsClient!);
      } catch (e) {
        // throw an custom error during the fieldFormatRegistry check
      }

      if (!fieldFormatRegistry) {
        throw new MLFieldFormatRegistryUninitialized(
          `ML's field format registry has not been initialized`
        );
      }

      return fieldFormatRegistry;
    };

    if (request instanceof KibanaRequest) {
      hasMlCapabilities = getHasMlCapabilities(request);
      scopedClient = clusterClient.asScoped(request);
      mlClient = getMlClient(scopedClient, jobSavedObjectService);
    } else {
      hasMlCapabilities = () => Promise.resolve();
      const { asInternalUser } = clusterClient;
      scopedClient = {
        asInternalUser,
        asCurrentUser: asInternalUser,
      };
      mlClient = getMlClient(scopedClient, jobSavedObjectService);
    }
    return {
      hasMlCapabilities,
      scopedClient,
      mlClient,
      jobSavedObjectService,
      getFieldsFormatRegistry,
    };
  };
}
