/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { HttpFetchOptions, HttpStart } from '@kbn/core/public';
import type { BulkInstallPackagesResponse } from '@kbn/fleet-plugin/common';
import { epmRouteService } from '@kbn/fleet-plugin/common';
import type { InstallPackageResponse } from '@kbn/fleet-plugin/common/types';
import { KibanaServices, useKibana } from '../lib/kibana';
import { useUserPrivileges } from '../components/user_privileges';

/**
 * Requests that the endpoint and security_detection_engine package be upgraded to the latest version
 *
 * @param http an http client for sending the request
 * @param options an object containing options for the request
 * @param prebuiltRulesPackageVersion specific version of the prebuilt rules package to install
 */
const sendUpgradeSecurityPackages = async (
  http: HttpStart,
  options: HttpFetchOptions = {},
  prebuiltRulesPackageVersion?: string
): Promise<void> => {
  const packages = ['endpoint', 'security_detection_engine'];
  const requests: Array<Promise<InstallPackageResponse | BulkInstallPackagesResponse>> = [];

  // If `prebuiltRulesPackageVersion` is provided, try to install that version
  // Must be done as two separate requests as bulk API doesn't support versions
  if (prebuiltRulesPackageVersion != null) {
    packages.splice(packages.indexOf('security_detection_engine'), 1);
    requests.push(
      http.post<InstallPackageResponse>(
        epmRouteService.getInstallPath('security_detection_engine', prebuiltRulesPackageVersion),
        {
          ...options,
          body: JSON.stringify({
            force: true,
          }),
        }
      )
    );
  }

  // Note: if `prerelease:true` option is provided, endpoint package will also be installed as prerelease
  requests.push(
    http.post<BulkInstallPackagesResponse>(epmRouteService.getBulkInstallPath(), {
      ...options,
      body: JSON.stringify({
        packages,
      }),
    })
  );

  await Promise.allSettled(requests);
};

export const useUpgradeSecurityPackages = () => {
  const context = useKibana();
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
          // Make sure fleet is initialized first
          await context.services.fleet?.isInitialized();

          // Always install the latest package if in dev env or snapshot build
          const isPrerelease =
            KibanaServices.getKibanaVersion().includes('-SNAPSHOT') ||
            KibanaServices.getKibanaBranch() === 'main';

          // ignore the response for now since we aren't notifying the user
          // Note: response would be Promise.allSettled, so must iterate all responses for errors and throw manually
          await sendUpgradeSecurityPackages(
            context.services.http,
            {
              query: {
                prerelease: isPrerelease,
              },
              signal,
            },
            KibanaServices.getPrebuiltRulesPackageVersion()
          );
        } catch (error) {
          // Ignore Errors, since this should not hinder the user's ability to use the UI

          // log to console, except if the error occurred due to aborting a request
          if (!abortController.signal.aborted) {
            // eslint-disable-next-line no-console
            console.error(error);
          }
        }
      })();

      return abortRequests;
    }
  }, [canAccessFleet, context.services.fleet, context.services.http]);
};
