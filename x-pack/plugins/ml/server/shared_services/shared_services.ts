/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IClusterClient,
  IScopedClusterClient,
  SavedObjectsClientContract,
  UiSettingsServiceStart,
} from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { KibanaRequest } from '@kbn/core/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import { MlLicense } from '../../common/license';

import { licenseChecks } from './license_checks';
import { MlSystemProvider, getMlSystemProvider } from './providers/system';
import { JobServiceProvider, getJobServiceProvider } from './providers/job_service';
import { ModulesProvider, getModulesProvider } from './providers/modules';
import { ResultsServiceProvider, getResultsServiceProvider } from './providers/results_service';
import {
  AnomalyDetectorsProvider,
  getAnomalyDetectorsProvider,
} from './providers/anomaly_detectors';
import type { ResolveMlCapabilities, MlCapabilitiesKey } from '../../common/types/capabilities';
import { hasMlCapabilitiesProvider, HasMlCapabilities } from '../lib/capabilities';
import {
  MLClusterClientUninitialized,
  MLFieldFormatRegistryUninitialized,
  MLUISettingsClientUninitialized,
} from './errors';
import { MlClient, getMlClient } from '../lib/ml_client';
import { mlSavedObjectServiceFactory, MLSavedObjectService } from '../saved_objects';
import {
  getAlertingServiceProvider,
  MlAlertingServiceProvider,
} from './providers/alerting_service';
import {
  getJobsHealthServiceProvider,
  JobsHealthServiceProvider,
} from '../lib/alerts/jobs_health_service';
import type { FieldFormatsRegistryProvider } from '../../common/types/kibana';
import { getDataViewsServiceFactory, GetDataViewsService } from '../lib/data_views_utils';

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
  mlSavedObjectService: MLSavedObjectService;
  getFieldsFormatRegistry: FieldFormatsRegistryProvider;
  getDataViewsService: GetDataViewsService;
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
  getDataViews: () => DataViewsPluginStart,
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
      getFieldsFormat,
      getDataViews
    );

    const {
      hasMlCapabilities,
      scopedClient,
      mlClient,
      mlSavedObjectService,
      getFieldsFormatRegistry,
      getDataViewsService,
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
        return callback({
          scopedClient,
          mlClient,
          mlSavedObjectService,
          getFieldsFormatRegistry,
          getDataViewsService,
        });
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
      ...getModulesProvider(getGuards, getDataViews),
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
  getFieldsFormat: () => FieldFormatsStart | null,
  getDataViews: () => DataViewsPluginStart
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
    const getSobSavedObjectService = (client: IScopedClusterClient) => {
      return mlSavedObjectServiceFactory(
        savedObjectsClient,
        internalSavedObjectsClient,
        spaceEnabled,
        authorization,
        client,
        isMlReady
      );
    };

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

    let mlSavedObjectService;
    if (request instanceof KibanaRequest) {
      hasMlCapabilities = getHasMlCapabilities(request);
      scopedClient = clusterClient.asScoped(request);
      mlSavedObjectService = getSobSavedObjectService(scopedClient);
      mlClient = getMlClient(scopedClient, mlSavedObjectService);
    } else {
      hasMlCapabilities = () => Promise.resolve();
      const { asInternalUser } = clusterClient;
      scopedClient = {
        asInternalUser,
        asCurrentUser: asInternalUser,
      };
      mlSavedObjectService = getSobSavedObjectService(scopedClient);
      mlClient = getMlClient(scopedClient, mlSavedObjectService);
    }

    const getDataViewsService = getDataViewsServiceFactory(
      getDataViews,
      savedObjectsClient,
      scopedClient,
      request
    );

    return {
      hasMlCapabilities,
      scopedClient,
      mlClient,
      mlSavedObjectService,
      getFieldsFormatRegistry,
      getDataViewsService,
    };
  };
}
