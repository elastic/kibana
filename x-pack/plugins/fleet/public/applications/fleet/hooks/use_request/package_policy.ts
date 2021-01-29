/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { sendRequest, useRequest } from './use_request';
import { packagePolicyRouteService } from '../../services';
import {
  CreatePackagePolicyRequest,
  CreatePackagePolicyResponse,
  UpdatePackagePolicyRequest,
  UpdatePackagePolicyResponse,
} from '../../types';
import {
  DeletePackagePoliciesRequest,
  DeletePackagePoliciesResponse,
  GetPackagePoliciesRequest,
  GetPackagePoliciesResponse,
  GetOnePackagePolicyResponse,
} from '../../../../../common/types/rest_spec';

export const sendCreatePackagePolicy = (body: CreatePackagePolicyRequest['body']) => {
  return sendRequest<CreatePackagePolicyResponse>({
    path: packagePolicyRouteService.getCreatePath(),
    method: 'post',
    body: JSON.stringify(body),
  });
};

export const sendUpdatePackagePolicy = (
  packagePolicyId: string,
  body: UpdatePackagePolicyRequest['body']
) => {
  return sendRequest<UpdatePackagePolicyResponse>({
    path: packagePolicyRouteService.getUpdatePath(packagePolicyId),
    method: 'put',
    body: JSON.stringify(body),
  });
};

export const sendDeletePackagePolicy = (body: DeletePackagePoliciesRequest['body']) => {
  return sendRequest<DeletePackagePoliciesResponse>({
    path: packagePolicyRouteService.getDeletePath(),
    method: 'post',
    body: JSON.stringify(body),
  });
};

export function useGetPackagePolicies(query: GetPackagePoliciesRequest['query']) {
  return useRequest<GetPackagePoliciesResponse>({
    method: 'get',
    path: packagePolicyRouteService.getListPath(),
    query,
  });
}

export const sendGetOnePackagePolicy = (packagePolicyId: string) => {
  return sendRequest<GetOnePackagePolicyResponse>({
    path: packagePolicyRouteService.getInfoPath(packagePolicyId),
    method: 'get',
  });
};
