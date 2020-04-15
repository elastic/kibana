/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpFetchQuery } from 'src/core/public';
import { useRequest, sendRequest } from './use_request';
import { epmRouteService } from '../../services';
import {
  GetCategoriesResponse,
  GetPackagesResponse,
  GetInfoResponse,
  InstallPackageResponse,
  DeletePackageResponse,
} from '../../types';

export const useGetCategories = () => {
  return useRequest<GetCategoriesResponse>({
    path: epmRouteService.getCategoriesPath(),
    method: 'get',
  });
};

export const useGetPackages = (query: HttpFetchQuery = {}) => {
  return useRequest<GetPackagesResponse>({
    path: epmRouteService.getListPath(),
    method: 'get',
    query,
  });
};

export const useGetPackageInfoByKey = (pkgkey: string) => {
  return useRequest<GetInfoResponse>({
    path: epmRouteService.getInfoPath(pkgkey),
    method: 'get',
  });
};

export const sendGetPackageInfoByKey = (pkgkey: string) => {
  return sendRequest<GetInfoResponse>({
    path: epmRouteService.getInfoPath(pkgkey),
    method: 'get',
  });
};

export const sendGetFileByPath = (filePath: string) => {
  return sendRequest<string>({
    path: epmRouteService.getFilePath(filePath),
    method: 'get',
  });
};

export const sendInstallPackage = (pkgkey: string) => {
  return sendRequest<InstallPackageResponse>({
    path: epmRouteService.getInstallPath(pkgkey),
    method: 'post',
  });
};

export const sendRemovePackage = (pkgkey: string) => {
  return sendRequest<DeletePackageResponse>({
    path: epmRouteService.getRemovePath(pkgkey),
    method: 'delete',
  });
};
