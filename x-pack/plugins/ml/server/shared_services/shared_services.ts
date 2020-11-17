/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IClusterClient, IScopedClusterClient, SavedObjectsClientContract } from 'kibana/server';
import { SpacesPluginSetup } from '../../../spaces/server';
// including KibanaRequest from 'kibana/server' causes an error
// when being used with instanceof
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { KibanaRequest } from '../../.././../../src/core/server/http';
import { MlLicense } from '../../common/license';

import type { CloudSetup } from '../../../cloud/server';
import type { SecurityPluginSetup } from '../../../security/server';
import { licenseChecks } from './license_checks';
import { MlSystemProvider, getMlSystemProvider } from './providers/system';
import { JobServiceProvider, getJobServiceProvider } from './providers/job_service';
import { ModulesProvider, getModulesProvider } from './providers/modules';
import { ResultsServiceProvider, getResultsServiceProvider } from './providers/results_service';
import {
  AnomalyDetectorsProvider,
  getAnomalyDetectorsProvider,
} from './providers/anomaly_detectors';
import { ResolveMlCapabilities, MlCapabilitiesKey } from '../../common/types/capabilities';
import { hasMlCapabilitiesProvider, HasMlCapabilities } from '../lib/capabilities';
import { MLClusterClientUninitialized } from './errors';
import { MlClient, getMlClient } from '../lib/ml_client';
import { jobSavedObjectServiceFactory, JobSavedObjectService } from '../saved_objects';

export type SharedServices = JobServiceProvider &
  AnomalyDetectorsProvider &
  MlSystemProvider &
  ModulesProvider &
  ResultsServiceProvider;

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
}

type OkCallback = (okParams: OkParams) => any;

export function createSharedServices(
  mlLicense: MlLicense,
  spacesPlugin: SpacesPluginSetup | undefined,
  cloud: CloudSetup,
  authorization: SecurityPluginSetup['authz'] | undefined,
  resolveMlCapabilities: ResolveMlCapabilities,
  getClusterClient: () => IClusterClient | null,
  getInternalSavedObjectsClient: () => SavedObjectsClientContract | null,
  isMlReady: () => Promise<void>
): SharedServices {
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
      spacesPlugin !== undefined,
      isMlReady
    );

    const { hasMlCapabilities, scopedClient, mlClient, jobSavedObjectService } = getRequestItems(
      request
    );
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
        return callback({ scopedClient, mlClient, jobSavedObjectService });
      },
    };
    return guards;
  }

  return {
    ...getJobServiceProvider(getGuards),
    ...getAnomalyDetectorsProvider(getGuards),
    ...getModulesProvider(getGuards),
    ...getResultsServiceProvider(getGuards),
    ...getMlSystemProvider(getGuards, mlLicense, spacesPlugin, cloud, resolveMlCapabilities),
  };
}

function getRequestItemsProvider(
  resolveMlCapabilities: ResolveMlCapabilities,
  getClusterClient: () => IClusterClient | null,
  savedObjectsClient: SavedObjectsClientContract,
  internalSavedObjectsClient: SavedObjectsClientContract,
  authorization: SecurityPluginSetup['authz'] | undefined,
  spaceEnabled: boolean,
  isMlReady: () => Promise<void>
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
    return { hasMlCapabilities, scopedClient, mlClient, jobSavedObjectService };
  };
}
