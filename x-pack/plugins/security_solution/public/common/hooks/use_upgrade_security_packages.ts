/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { HttpFetchOptions, HttpStart } from 'kibana/public';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { epmRouteService, BulkInstallPackagesResponse } from '../../../../fleet/common';
import { StartServices } from '../../types';
import { useUserPrivileges } from '../components/user_privileges';

/**
 * Requests that the endpoint and security_detection_engine package be upgraded to the latest version
 *
 * @param http an http client for sending the request
 * @param options an object containing options for the request
 */
const sendUpgradeSecurityPackages = async (
  http: HttpStart,
  options: HttpFetchOptions = {}
): Promise<BulkInstallPackagesResponse> => {
  return http.post<BulkInstallPackagesResponse>(epmRouteService.getBulkInstallPath(), {
    ...options,
    body: JSON.stringify({
      packages: ['endpoint', 'security_detection_engine'],
    }),
  });
};

export const useUpgradeSecurityPackages = () => {
  const context = useKibana<StartServices>();
  const canAccessFleet = useUserPrivileges().endpointPrivileges.canAccessFleet;

  useEffect(() => {
    const abortController = new AbortController();

    // cancel any ongoing requests
    const abortRequests = () => {
      abortController.abort();
    };

    if (canAccessFleet) {
      const signal = abortController.signal;

      (async () => {
        try {
          // ignore the response for now since we aren't notifying the user
          await sendUpgradeSecurityPackages(context.services.http, { signal });
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
  }, [canAccessFleet, context.services.http]);
};
