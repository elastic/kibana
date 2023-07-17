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
import { EndpointDataLoadingError, wrapErrorAndRejectPromise } from './utils';

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

  // Setup Fleet
  try {
    const setupResponse = (await kbnClient
      .request({
        path: SETUP_API_ROUTE,
        method: 'POST',
      })
      .catch(wrapErrorAndRejectPromise)) as AxiosResponse<PostFleetSetupResponse>;

    if (!setupResponse.data.isInitialized) {
      log.error(setupResponse.data);
      throw new Error('Initializing the ingest manager failed, existing');
    }
  } catch (error) {
    log.error(error);
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
      log.error(setupResponse);
      throw new Error('Initializing Fleet failed');
    }
  } catch (error) {
    log.error(error);
    throw error;
  }

  // Install/upgrade the endpoint package
  try {
    await installOrUpgradeEndpointFleetPackage(kbnClient, log);
  } catch (error) {
    log.error(error);
    throw error;
  }
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

  const bulkResp = installEndpointPackageResp.data.items;

  if (bulkResp.length <= 0) {
    throw new EndpointDataLoadingError(
      'Installing the Endpoint package failed, response was empty, existing',
      bulkResp
    );
  }

  const installResponse = bulkResp[0];

  logger.info(installResponse);

  if (isFleetBulkInstallError(installResponse)) {
    if (installResponse.error instanceof Error) {
      throw new EndpointDataLoadingError(
        `Installing the Endpoint package failed: ${installResponse.error.message}, exiting`,
        bulkResp
      );
    }

    // Ignore `409` (conflicts due to Concurrent install or upgrades of package) errors
    if (installResponse.statusCode !== 409) {
      // when `no_shard_available_action_exception` errors re-run install or upgrade after a delay
      if (isNoShardAvailableActionExceptionError(installResponse)) {
        logger.warning(
          `Known transient failure detected: no_shard_available_action_exception. Retrying...`
        );

        await retryInstallOrUpgradeEndpointFleetPackage(() => {
          return installOrUpgradeEndpointFleetPackage(kbnClient, logger);
        }, logger);
      }

      throw new EndpointDataLoadingError(installResponse.error, bulkResp);
    }
  }

  return bulkResp[0] as BulkInstallPackageInfo;
};

function isFleetBulkInstallError(
  installResponse: BulkInstallPackageInfo | IBulkInstallPackageHTTPError
): installResponse is IBulkInstallPackageHTTPError {
  return 'error' in installResponse && installResponse.error !== undefined;
}

function isNoShardAvailableActionExceptionError(error: IBulkInstallPackageHTTPError): boolean {
  return (
    typeof error.error === 'string' && error.error.includes('no_shard_available_action_exception')
  );
}

// retry logic for install or upgrade of endpoint package
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_RETRY_INSTALL_UPGRADE_ATTEMPTS = 3;

const retryInstallOrUpgradeEndpointFleetPackage = async <T>(
  callback: () => Promise<T>,
  logger: ToolingLog
): Promise<T | undefined> => {
  const log = logger.withType('retryInstallOrUpgradeEndpointFleetPackage');
  let attempt = 1;
  let responsePromise: Promise<T>;

  while (attempt <= MAX_RETRY_INSTALL_UPGRADE_ATTEMPTS) {
    const thisAttempt = attempt;
    attempt++;

    log.info(
      `retryInstallOrUpgradeEndpointFleetPackage(): attempt ${thisAttempt} started at: ${new Date().toISOString()}`
    );

    try {
      responsePromise = callback();
      await responsePromise;
      return responsePromise; // since we got this far, we know that API returned success. Return it
    } catch (err) {
      log.info(
        `retryInstallOrUpgradeEndpointFleetPackage(): attempt ${thisAttempt} failed with:`,
        err
      );

      // If not a no_shard_available_action_exception error, then end loop here and throw
      if (!isNoShardAvailableActionExceptionError(err)) {
        log.error(err);
        return Promise.reject(err);
      }
    }

    await delay(10000);
  }

  // @ts-expect-error;
  return responsePromise;
};
