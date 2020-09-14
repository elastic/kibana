/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import semver from 'semver';
import React, { useEffect } from 'react';
import { HttpFetchOptions, HttpStart } from 'src/core/public';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import {
  GetInfoResponse,
  epmRouteService,
  PackageInfo,
  InstallPackageRequest,
} from '../../../../../ingest_manager/common';
import { sendGetEndpointSecurityPackage } from '../../../management/pages/policy/store/policy_list/services/ingest';
import { StartServices } from '../../../types';

/**
 * Retrieves a list of endpoint specific package policies (those created with a `package.name` of
 * `endpoint`) from Ingest
 * @param http
 * @param options
 */
export const sendGetEndpointPackageInfo = async (
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
          const endpointPackageInfo = await sendGetEndpointPackageInfo(
            context.services.http,
            createPackageKey(endpointPackage.name, endpointPackage.version)
          );
          if (semver.gt(endpointPackageInfo.latestVersion, endpointPackageInfo.version)) {
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
  }, [hasPermissions, context.services.http]);

  return null;
};
