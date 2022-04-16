/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AxiosResponse } from 'axios';
// eslint-disable-next-line import/no-extraneous-dependencies
import { KbnClient } from '@kbn/test';
import {
  AGENTS_SETUP_API_ROUTES,
  BulkInstallPackageInfo,
  BulkInstallPackagesResponse,
  EPM_API_ROUTES,
  IBulkInstallPackageHTTPError,
  PostFleetSetupResponse,
  SETUP_API_ROUTE,
} from '@kbn/fleet-plugin/common';
import { EndpointDataLoadingError, wrapErrorAndRejectPromise } from './utils';

export interface SetupFleetForEndpointResponse {
  endpointPackage: BulkInstallPackageInfo;
}

/**
 * Calls the fleet setup APIs and then installs the latest Endpoint package
 * @param kbnClient
 */
export const setupFleetForEndpoint = async (
  kbnClient: KbnClient
): Promise<SetupFleetForEndpointResponse> => {
  // We try to use the kbnClient **private** logger, bug if unable to access it, then just use console
  // @ts-expect-error TS2341
  const log = kbnClient.log ? kbnClient.log : console;

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
      log.error(setupResponse.data);
      throw new Error('Initializing Fleet failed, existing');
    }
  } catch (error) {
    log.error(error);
    throw error;
  }

  // Install/upgrade the endpoint package
  let endpointPackage: BulkInstallPackageInfo;

  try {
    endpointPackage = await installOrUpgradeEndpointFleetPackage(kbnClient);
  } catch (error) {
    log.error(error);
    throw error;
  }

  return { endpointPackage };
};

/**
 * Installs the Endpoint package (or upgrades it) in Fleet to the latest available in the registry
 *
 * @param kbnClient
 */
export const installOrUpgradeEndpointFleetPackage = async (
  kbnClient: KbnClient
): Promise<BulkInstallPackageInfo> => {
  const installEndpointPackageResp = (await kbnClient
    .request({
      path: EPM_API_ROUTES.BULK_INSTALL_PATTERN,
      method: 'POST',
      body: {
        packages: ['endpoint'],
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

  const firstError = bulkResp[0];

  if (isFleetBulkInstallError(firstError)) {
    if (firstError.error instanceof Error) {
      throw new EndpointDataLoadingError(
        `Installing the Endpoint package failed: ${firstError.error.message}, exiting`,
        bulkResp
      );
    }

    // Ignore `409` (conflicts due to Concurrent install or upgrades of package) errors
    if (firstError.statusCode !== 409) {
      throw new EndpointDataLoadingError(firstError.error, bulkResp);
    }
  }

  return bulkResp[0] as BulkInstallPackageInfo;
};

function isFleetBulkInstallError(
  installResponse: BulkInstallPackageInfo | IBulkInstallPackageHTTPError
): installResponse is IBulkInstallPackageHTTPError {
  return 'error' in installResponse && installResponse.error !== undefined;
}
