/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import semver from 'semver';
import { useEffect } from 'react';
import { HttpFetchOptions, HttpStart } from 'src/core/public';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import {
  GetInfoResponse,
  epmRouteService,
  PackageInfo,
  InstallPackageRequest,
  InstallationStatus,
} from '../../../../../ingest_manager/common';
import { sendGetEndpointSecurityPackage } from '../../../management/pages/policy/store/policy_list/services/ingest';
import { StartServices } from '../../../types';

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
): Promise<unknown> => {
  return http.post<InstallPackageRequest>(epmRouteService.getInstallPath(packageKey), {
    ...options,
  });
};

const createPackageKey = (name: string, version: string) => {
  return `${name}-${version}`;
};

export const UpgradeEndpointPackage = ({ hasPermissions }: { hasPermissions: boolean }) => {
  const context = useKibana<StartServices>();

  useEffect(() => {
    if (hasPermissions) {
      (async () => {
        try {
          const endpointPackage = await sendGetEndpointSecurityPackage(context.services.http);
          const currentPackageKey = createPackageKey(endpointPackage.name, endpointPackage.version);
          if (endpointPackage.status === InstallationStatus.notInstalled) {
            console.log('no current installed package');
            await sendInstallPackage(context.services.http, currentPackageKey);
            return;
          }

          const endpointPackageInfo = await sendGetPackageInfo(
            context.services.http,
            createPackageKey(endpointPackage.name, endpointPackage.version)
          );
          console.log('checking version');
          console.log(
            `latest: ${endpointPackageInfo.latestVersion} current: ${endpointPackageInfo.version}`
          );
          if (semver.gt(endpointPackageInfo.latestVersion, endpointPackageInfo.version)) {
            console.log('latest version was greater');
            await sendInstallPackage(
              context.services.http,
              createPackageKey(endpointPackageInfo.name, endpointPackageInfo.latestVersion)
            );
          }
        } catch (error) {
          // Ignore Errors, since this should not hinder the user's ability to use the UI
          // eslint-disable-next-line no-console
          console.error(error);
        }
      })();
    }
    // todo I think we want to run the code regardless of whether these change
  }, [hasPermissions, context.services.http]);

  return null;
};
