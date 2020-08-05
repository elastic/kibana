/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { sendRequest, useRequest } from './use_request';
import { packageConfigRouteService } from '../../services';
import {
  CreatePackageConfigRequest,
  CreatePackageConfigResponse,
  UpdatePackageConfigRequest,
  UpdatePackageConfigResponse,
} from '../../types';
import {
  DeletePackageConfigsRequest,
  DeletePackageConfigsResponse,
  GetPackageConfigsRequest,
  GetPackageConfigsResponse,
  GetOnePackageConfigResponse,
} from '../../../../../common/types/rest_spec';

export const sendCreatePackageConfig = (body: CreatePackageConfigRequest['body']) => {
  return sendRequest<CreatePackageConfigResponse>({
    path: packageConfigRouteService.getCreatePath(),
    method: 'post',
    body: JSON.stringify(body),
  });
};

export const sendUpdatePackageConfig = (
  packageConfigId: string,
  body: UpdatePackageConfigRequest['body']
) => {
  return sendRequest<UpdatePackageConfigResponse>({
    path: packageConfigRouteService.getUpdatePath(packageConfigId),
    method: 'put',
    body: JSON.stringify(body),
  });
};

export const sendDeletePackageConfig = (body: DeletePackageConfigsRequest['body']) => {
  return sendRequest<DeletePackageConfigsResponse>({
    path: packageConfigRouteService.getDeletePath(),
    method: 'post',
    body: JSON.stringify(body),
  });
};

export function useGetPackageConfigs(query: GetPackageConfigsRequest['query']) {
  return useRequest<GetPackageConfigsResponse>({
    method: 'get',
    path: packageConfigRouteService.getListPath(),
    query,
  });
}

export const sendGetOnePackageConfig = (packageConfigId: string) => {
  return sendRequest<GetOnePackageConfigResponse>({
    path: packageConfigRouteService.getInfoPath(packageConfigId),
    method: 'get',
  });
};
