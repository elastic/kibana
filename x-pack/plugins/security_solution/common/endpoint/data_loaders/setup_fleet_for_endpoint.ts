/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AxiosResponse } from 'axios';
import type { KbnClient } from '@kbn/test';
import type {
  BulkInstallPackageInfo,
  BulkInstallPackagesResponse,
  IBulkInstallPackageHTTPError,
  PostFleetSetupResponse,
} from '@kbn/fleet-plugin/common';
import { AGENTS_SETUP_API_ROUTES, EPM_API_ROUTES, SETUP_API_ROUTE } from '@kbn/fleet-plugin/common';
import { ToolingLog } from '@kbn/tooling-log';
import { UsageTracker } from './usage_tracker';
import { EndpointDataLoadingError, retryOnError, wrapErrorAndRejectPromise } from './utils';

const usageTracker = new UsageTracker({ dumpOnProcessExit: true });

export interface SetupFleetForEndpointResponse {
  endpointPackage: BulkInstallPackageInfo;
}

/**
 * Calls the fleet setup APIs and then installs the latest Endpoint package
 * @param kbnClient
 * @param logger
 */
export const setupFleetForEndpoint = async (
  kbnClient: KbnClient,
  logger?: ToolingLog
): Promise<void> => {
  const log = logger ?? new ToolingLog();
  const usageRecord = usageTracker.create('setupFleetForEndpoint()');

  log.info(`setupFleetForEndpoint(): Setting up fleet for endpoint`);

  // Setup Fleet
  try {
    const setupResponse = (await kbnClient
      .request({
        path: SETUP_API_ROUTE,
        method: 'POST',
      })
      .catch(wrapErrorAndRejectPromise)) as AxiosResponse<PostFleetSetupResponse>;

    if (!setupResponse.data.isInitialized) {
      log.error(new Error(JSON.stringify(setupResponse.data, null, 2)));
      throw new Error('Initializing the ingest manager failed, existing');
    }
  } catch (error) {
    log.error(error);
    usageRecord.set('failure', error.message);

    throw error;
  }

  // Setup Agents
  try {
    const setupResponse = (await kbnClient
      .request({
        path: AGENTS_SETUP_API_ROUTES.CREATE_PATTERN,
        method: 'POST',
      })
      .catch(wrapErrorAndRejectPromise)) as AxiosResponse<PostFleetSetupResponse>;

    if (!setupResponse.data.isInitialized) {
      log.error(new Error(JSON.stringify(setupResponse, null, 2)));
      throw new Error('Initializing Fleet failed');
    }
  } catch (error) {
    log.error(error);

    usageRecord.set('failure', error.message);

    throw error;
  }

  // Install/upgrade the endpoint package
  try {
    await installOrUpgradeEndpointFleetPackage(kbnClient, log);
  } catch (error) {
    log.error(error);

    usageRecord.set('failure', error.message);

    throw error;
  }

  usageRecord.set('success');
};

/**
 * Installs the Endpoint package (or upgrades it) in Fleet to the latest available in the registry
 *
 * @param kbnClient
 * @param logger
 */
export const installOrUpgradeEndpointFleetPackage = async (
  kbnClient: KbnClient,
  logger: ToolingLog
): Promise<BulkInstallPackageInfo> => {
  logger.info(`installOrUpgradeEndpointFleetPackage(): starting`);

  const usageRecord = usageTracker.create('installOrUpgradeEndpointFleetPackage()');

  const updatePackages = async () => {
    const installEndpointPackageResp = (await kbnClient
      .request({
        path: EPM_API_ROUTES.BULK_INSTALL_PATTERN,
        method: 'POST',
        body: {
          packages: ['endpoint'],
        },
        query: {
          prerelease: true,
        },
      })
      .catch(wrapErrorAndRejectPromise)) as AxiosResponse<BulkInstallPackagesResponse>;

    logger.debug(`Fleet bulk install response:`, installEndpointPackageResp.data);

    const bulkResp = installEndpointPackageResp.data.items;

    if (bulkResp.length <= 0) {
      throw new EndpointDataLoadingError(
        'Installing the Endpoint package failed, response was empty, existing',
        bulkResp
      );
    }

    const installResponse = bulkResp[0];

    logger.debug('package install response:', installResponse);

    if (isFleetBulkInstallError(installResponse)) {
      if (installResponse.error instanceof Error) {
        throw new EndpointDataLoadingError(
          `Installing the Endpoint package failed: ${installResponse.error.message}`,
          bulkResp
        );
      }

      // Ignore `409` (conflicts due to Concurrent install or upgrades of package) errors
      if (installResponse.statusCode !== 409) {
        throw new EndpointDataLoadingError(installResponse.error, bulkResp);
      }
    }

    return bulkResp[0] as BulkInstallPackageInfo;
  };

  return retryOnError(
    updatePackages,
    ['no_shard_available_action_exception', 'illegal_index_shard_state_exception'],
    logger,
    5,
    10000
  )
    .then((result) => {
      usageRecord.set('success');

      return result;
    })
    .catch((err) => {
      usageRecord.set('failure', err.message);
      usageTracker.dump(logger);

      throw err;
    });
};

function isFleetBulkInstallError(
  installResponse: BulkInstallPackageInfo | IBulkInstallPackageHTTPError
): installResponse is IBulkInstallPackageHTTPError {
  return 'error' in installResponse && installResponse.error !== undefined;
}
