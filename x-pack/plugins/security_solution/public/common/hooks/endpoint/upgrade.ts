/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useEffect } from 'react';
import { HttpFetchOptions, HttpStart } from 'src/core/public';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import {
  epmRouteService,
  appRoutesService,
  CheckPermissionsResponse,
  BulkInstallPackagesResponse,
} from '../../../../../fleet/common';
import { StartServices } from '../../../types';
import { useIngestEnabledCheck } from './ingest_enabled';

/**
 * Requests that the endpoint package be upgraded to the latest version
 *
 * @param http an http client for sending the request
 * @param options an object containing options for the request
 */
const sendUpgradeEndpointPackage = async (
  http: HttpStart,
  options: HttpFetchOptions = {}
): Promise<BulkInstallPackagesResponse> => {
  return http.post<BulkInstallPackagesResponse>(epmRouteService.getBulkInstallPath(), {
    ...options,
    body: JSON.stringify({
      packages: ['endpoint'],
    }),
  });
};

/**
 * Checks with the ingest manager if the current user making these requests has the right permissions
 * to install the endpoint package.
 *
 * @param http an http client for sending the request
 * @param options an object containing options for the request
 */
const sendCheckPermissions = async (
  http: HttpStart,
  options: HttpFetchOptions = {}
): Promise<CheckPermissionsResponse> => {
  return http.get<CheckPermissionsResponse>(appRoutesService.getCheckPermissionsPath(), {
    ...options,
  });
};

export const useUpgradeEndpointPackage = () => {
  const context = useKibana<StartServices>();
  const { allEnabled: ingestEnabled } = useIngestEnabledCheck();

  useEffect(() => {
    const abortController = new AbortController();

    // cancel any ongoing requests
    const abortRequests = () => {
      abortController.abort();
    };

    if (ingestEnabled) {
      const signal = abortController.signal;

      (async () => {
        try {
          // make sure we're a privileged user before trying to install the package
          const { success: hasPermissions } = await sendCheckPermissions(context.services.http, {
            signal,
          });

          // if we're not a privileged user then return and don't try to check the status of the endpoint package
          if (!hasPermissions) {
            return abortRequests;
          }

          // ignore the response for now since we aren't notifying the user
          await sendUpgradeEndpointPackage(context.services.http, { signal });
        } catch (error) {
          // Ignore Errors, since this should not hinder the user's ability to use the UI

          // ignore the error that occurs from aborting a request
          if (!abortController.signal.aborted) {
            // eslint-disable-next-line no-console
            console.error(error);
          }
        }

        return abortRequests;
      })();
    }
  }, [ingestEnabled, context.services.http]);
};
