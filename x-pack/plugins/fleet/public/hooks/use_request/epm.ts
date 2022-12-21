/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useAsync from 'react-use/lib/useAsync';

import { useEffect, useState } from 'react';

import { epmRouteService, isVerificationError } from '../../services';
import type {
  GetCategoriesRequest,
  GetCategoriesResponse,
  GetPackagesRequest,
  GetPackagesResponse,
  GetLimitedPackagesResponse,
  GetInfoResponse,
  InstallPackageResponse,
  DeletePackageResponse,
  UpdatePackageRequest,
  UpdatePackageResponse,
} from '../../types';
import type { FleetErrorResponse, GetStatsResponse } from '../../../common/types';

import { getCustomIntegrations } from '../../services/custom_integrations';

import { useConfirmOpenUnverified } from '../../applications/integrations/hooks/use_confirm_open_unverified';

import { useRequest, sendRequest } from './use_request';

export function useGetAppendCustomIntegrations() {
  const customIntegrations = getCustomIntegrations();
  return useAsync(customIntegrations.getAppendCustomIntegrations, []);
}

export function useGetReplacementCustomIntegrations() {
  const customIntegrations = getCustomIntegrations();
  return useAsync(customIntegrations.getReplacementCustomIntegrations, []);
}

export const useGetCategories = (query: GetCategoriesRequest['query'] = {}) => {
  return useRequest<GetCategoriesResponse>({
    path: epmRouteService.getCategoriesPath(),
    method: 'get',
    query,
  });
};

export const sendGetCategories = (query: GetCategoriesRequest['query'] = {}) => {
  return sendRequest<GetCategoriesResponse>({
    path: epmRouteService.getCategoriesPath(),
    method: 'get',
    query,
  });
};

export const useGetPackages = (query: GetPackagesRequest['query'] = {}) => {
  return useRequest<GetPackagesResponse>({
    path: epmRouteService.getListPath(),
    method: 'get',
    query,
  });
};

export const sendGetPackages = (query: GetPackagesRequest['query'] = {}) => {
  return sendRequest<GetPackagesResponse>({
    path: epmRouteService.getListPath(),
    method: 'get',
    query,
  });
};

export const useGetLimitedPackages = () => {
  return useRequest<GetLimitedPackagesResponse>({
    path: epmRouteService.getListLimitedPath(),
    method: 'get',
  });
};

export const useGetPackageInfoByKey = (
  pkgName: string,
  pkgVersion?: string,
  options?: {
    ignoreUnverified?: boolean;
    prerelease?: boolean;
    full?: boolean;
  }
) => {
  const confirmOpenUnverified = useConfirmOpenUnverified();
  const [ignoreUnverifiedQueryParam, setIgnoreUnverifiedQueryParam] = useState(
    options?.ignoreUnverified
  );
  const res = useRequest<GetInfoResponse>({
    path: epmRouteService.getInfoPath(pkgName, pkgVersion),
    method: 'get',
    query: {
      ...options,
      ...(ignoreUnverifiedQueryParam && { ignoreUnverified: ignoreUnverifiedQueryParam }),
    },
  });

  useEffect(() => {
    const confirm = async () => {
      const forceInstall = await confirmOpenUnverified(pkgName);

      if (forceInstall) {
        setIgnoreUnverifiedQueryParam(true);
      }
    };

    if (res.error && isVerificationError(res.error)) {
      confirm();
    }
  }, [res.error, pkgName, pkgVersion, confirmOpenUnverified]);

  return res;
};

export const useGetPackageStats = (pkgName: string) => {
  return useRequest<GetStatsResponse>({
    path: epmRouteService.getStatsPath(pkgName),
    method: 'get',
  });
};

export const sendGetPackageInfoByKey = (
  pkgName: string,
  pkgVersion?: string,
  options?: {
    ignoreUnverified?: boolean;
    prerelease?: boolean;
    full?: boolean;
  }
) => {
  return sendRequest<GetInfoResponse>({
    path: epmRouteService.getInfoPath(pkgName, pkgVersion),
    method: 'get',
    query: options,
  });
};

export const useGetFileByPath = (filePath: string) => {
  return useRequest<string>({
    path: epmRouteService.getFilePath(filePath),
    method: 'get',
  });
};

export const sendGetFileByPath = (filePath: string) => {
  return sendRequest<string>({
    path: epmRouteService.getFilePath(filePath),
    method: 'get',
  });
};

export const sendInstallPackage = (pkgName: string, pkgVersion: string, force: boolean = false) => {
  const body = force ? { force } : undefined;
  return sendRequest<InstallPackageResponse, FleetErrorResponse>({
    path: epmRouteService.getInstallPath(pkgName, pkgVersion),
    method: 'post',
    body,
  });
};

export const sendBulkInstallPackages = (packages: string[]) => {
  return sendRequest<InstallPackageResponse, FleetErrorResponse>({
    path: epmRouteService.getBulkInstallPath(),
    method: 'post',
    body: {
      packages,
    },
  });
};

export const sendRemovePackage = (pkgName: string, pkgVersion: string, force: boolean = false) => {
  return sendRequest<DeletePackageResponse>({
    path: epmRouteService.getRemovePath(pkgName, pkgVersion),
    method: 'delete',
    body: {
      force,
    },
  });
};

export const sendUpdatePackage = (
  pkgName: string,
  pkgVersion: string,
  body: UpdatePackageRequest['body']
) => {
  return sendRequest<UpdatePackageResponse>({
    path: epmRouteService.getUpdatePath(pkgName, pkgVersion),
    method: 'put',
    body,
  });
};
