/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useAsync from 'react-use/lib/useAsync';

import { epmRouteService } from '../../services';
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
import type { GetStatsResponse } from '../../../common';

import { getCustomIntegrations } from '../../services/custom_integrations';

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
    query: { experimental: true, ...query },
  });
};

export const useGetPackages = (query: GetPackagesRequest['query'] = {}) => {
  return useRequest<GetPackagesResponse>({
    path: epmRouteService.getListPath(),
    method: 'get',
    query: { experimental: true, ...query },
  });
};

export const sendGetPackages = (query: GetPackagesRequest['query'] = {}) => {
  return sendRequest<GetPackagesResponse>({
    path: epmRouteService.getListPath(),
    method: 'get',
    query: { experimental: true, ...query },
  });
};

export const useGetLimitedPackages = () => {
  return useRequest<GetLimitedPackagesResponse>({
    path: epmRouteService.getListLimitedPath(),
    method: 'get',
  });
};

export const useGetPackageInfoByKey = (pkgName: string, pkgVersion?: string) => {
  return useRequest<GetInfoResponse>({
    path: epmRouteService.getInfoPath(pkgName, pkgVersion),
    method: 'get',
  });
};

export const useGetPackageStats = (pkgName: string) => {
  return useRequest<GetStatsResponse>({
    path: epmRouteService.getStatsPath(pkgName),
    method: 'get',
  });
};

export const sendGetPackageInfoByKey = (pkgName: string, pkgVersion?: string) => {
  return sendRequest<GetInfoResponse>({
    path: epmRouteService.getInfoPath(pkgName, pkgVersion),
    method: 'get',
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

export const sendInstallPackage = (pkgName: string, pkgVersion: string) => {
  return sendRequest<InstallPackageResponse>({
    path: epmRouteService.getInstallPath(pkgName, pkgVersion),
    method: 'post',
  });
};

export const sendRemovePackage = (pkgName: string, pkgVersion: string) => {
  return sendRequest<DeletePackageResponse>({
    path: epmRouteService.getRemovePath(pkgName, pkgVersion),
    method: 'delete',
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
