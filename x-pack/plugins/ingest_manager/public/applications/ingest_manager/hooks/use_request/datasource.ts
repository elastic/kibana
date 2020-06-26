/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { sendRequest, useRequest } from './use_request';
import { datasourceRouteService } from '../../services';
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

export const sendCreateDatasource = (body: CreatePackageConfigRequest['body']) => {
  return sendRequest<CreatePackageConfigResponse>({
    path: datasourceRouteService.getCreatePath(),
    method: 'post',
    body: JSON.stringify(body),
  });
};

export const sendUpdateDatasource = (
  datasourceId: string,
  body: UpdatePackageConfigRequest['body']
) => {
  return sendRequest<UpdatePackageConfigResponse>({
    path: datasourceRouteService.getUpdatePath(datasourceId),
    method: 'put',
    body: JSON.stringify(body),
  });
};

export const sendDeleteDatasource = (body: DeletePackageConfigsRequest['body']) => {
  return sendRequest<DeletePackageConfigsResponse>({
    path: datasourceRouteService.getDeletePath(),
    method: 'post',
    body: JSON.stringify(body),
  });
};

export function useGetDatasources(query: GetPackageConfigsRequest['query']) {
  return useRequest<GetPackageConfigsResponse>({
    method: 'get',
    path: datasourceRouteService.getListPath(),
    query,
  });
}

export const sendGetOneDatasource = (datasourceId: string) => {
  return sendRequest<GetOnePackageConfigResponse>({
    path: datasourceRouteService.getInfoPath(datasourceId),
    method: 'get',
  });
};
