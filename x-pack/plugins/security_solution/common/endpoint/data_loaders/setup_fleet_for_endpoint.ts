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
} from '../../../../fleet/common';
import { EndpointDataLoadingError, wrapErrorAndRejectPromise } from './utils';

/**
 * Calls the fleet setup APIs and then installs the latest Endpoint package
 * @param kbnClient
 */
export const setupFleetForEndpoint = async (kbnClient: KbnClient) => {
  // We try to use the kbnClient **private** logger, bug if unable to access it, then just use console
  // @ts-ignore
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
  try {
    await installOrUpgradeEndpointFleetPackage(kbnClient);
  } catch (error) {
    log.error(error);
    throw error;
  }
};

/**
 * Installs the Endpoint package (or upgrades it) in Fleet to the latest available in the registry
 *
 * @param kbnClient
 */
export const installOrUpgradeEndpointFleetPackage = async (kbnClient: KbnClient): Promise<void> => {
  const installEndpointPackageResp = (await kbnClient
    .request({
      path: EPM_API_ROUTES.BULK_INSTALL_PATTERN,
      method: 'POST',
      body: {
        packages: ['endpoint'],
      },
    })
    .catch(wrapErrorAndRejectPromise)) as AxiosResponse<BulkInstallPackagesResponse>;

  const bulkResp = installEndpointPackageResp.data.response;

  if (bulkResp.length <= 0) {
    throw new EndpointDataLoadingError(
      'Installing the Endpoint package failed, response was empty, existing',
      bulkResp
    );
  }

  if (isFleetBulkInstallError(bulkResp[0])) {
    if (bulkResp[0].error instanceof Error) {
      throw new EndpointDataLoadingError(
        `Installing the Endpoint package failed: ${bulkResp[0].error.message}, exiting`,
        bulkResp
      );
    }

    throw new EndpointDataLoadingError(bulkResp[0].error, bulkResp);
  }
};

function isFleetBulkInstallError(
  installResponse: BulkInstallPackageInfo | IBulkInstallPackageHTTPError
): installResponse is IBulkInstallPackageHTTPError {
  return 'error' in installResponse && installResponse.error !== undefined;
}
