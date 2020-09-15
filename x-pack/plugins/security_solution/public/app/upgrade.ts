/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import semver from 'semver';
import { useEffect } from 'react';
import { HttpFetchOptions, HttpStart } from 'src/core/public';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import {
  GetInfoResponse,
  epmRouteService,
  PackageInfo,
  InstallPackageRequest,
  InstallationStatus,
  appRoutesService,
  CheckPermissionsResponse,
  InstallPackageResponse,
} from '../../../ingest_manager/common';
import { sendGetEndpointSecurityPackage } from '../management/pages/policy/store/policy_list/services/ingest';
import { StartServices } from '../types';
import { useIngestEnabledCheck } from '../common/hooks/endpoint/ingest_enabled';

/**
 * Retrieves the info for a package from the ingest manager
 *
 * @param http an http client for sending the request
 * @param packageKey a string in the form of <package name>-<package version>
 * @param options an object containing options for the request
 */
const sendGetPackageInfo = async (
  http: HttpStart,
  packageKey: string,
  options: HttpFetchOptions = {}
): Promise<PackageInfo> => {
  return (
    await http.get<GetInfoResponse>(epmRouteService.getInfoPath(packageKey), {
      ...options,
    })
  ).response;
};

/**
 * Requests the ingest manager to install a specific package indicated by the package key
 *
 * @param http an http client for sending the request
 * @param packageKey a string in the form of <package name>-<package version>
 * @param options an object containing options for the request
 */
const sendInstallPackage = async (
  http: HttpStart,
  packageKey: string,
  options: HttpFetchOptions = {}
): Promise<InstallPackageResponse> => {
  return http.post<InstallPackageResponse>(epmRouteService.getInstallPath(packageKey), {
    ...options,
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

const createPackageKey = (name: string, version: string) => {
  return `${name}-${version}`;
};

export const UpgradeEndpointPackage = () => {
  const context = useKibana<StartServices>();
  const { allEnabled: ingestEnabled } = useIngestEnabledCheck();

  useEffect(() => {
    const abortController = new AbortController();

    // cancel any ongoing requests
    const cleanup = () => {
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
            return cleanup;
          }

          // get the endpoint package's basic information
          const endpointPackage = await sendGetEndpointSecurityPackage(context.services.http, {
            signal,
          });
          if (endpointPackage.status === InstallationStatus.notInstalled) {
            await sendInstallPackage(
              context.services.http,
              createPackageKey(endpointPackage.name, endpointPackage.version),
              { signal }
            );
            return cleanup;
          }

          /**
           * If a package is installed the `endpointPackage` variable will look like this:
           * {
           *  "name": "endpoint",
           *  "version": "0.16.0-dev.1",
           *  ...
           *  "status": "installed",
           *  "savedObject": {
           *    ...
           *    "attributes": {
           *      ...
           *      "name": "endpoint",
           *      "version": "0.13.1",
           *      "internal": false,
           *      "removable": false,
           *      "install_version": "0.13.1",
           *      "install_status": "installed",
           *      "install_started_at": "2020-09-15T19:52:25.153Z"
           *    },
           *    ...
           *  }
           *}
           * So to get the actual installed version of the package we need to look in the `savedObject` section
           */
          const installedPackageKey = createPackageKey(
            endpointPackage.savedObject.attributes.name,
            endpointPackage.savedObject.attributes.version
          );

          // Just to be sure, lets get the full package info, which will include a `latestVersion` field for the endpoint package
          const endpointPackageInfo = await sendGetPackageInfo(
            context.services.http,
            installedPackageKey,
            { signal }
          );

          // check and see if the latest version is newer than the one we have installed
          if (semver.gt(endpointPackageInfo.latestVersion, endpointPackageInfo.version)) {
            await sendInstallPackage(
              context.services.http,
              createPackageKey(endpointPackageInfo.name, endpointPackageInfo.latestVersion),
              { signal }
            );
          }
        } catch (error) {
          // Ignore Errors, since this should not hinder the user's ability to use the UI
          // eslint-disable-next-line no-console
          console.error(error);
        }

        return cleanup;
      })();
    }
  }, [ingestEnabled, context.services.http]);

  return null;
};
