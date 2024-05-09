/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery } from '@tanstack/react-query';

import { packagePolicyRouteService } from '../../services';
import type {
  CreatePackagePolicyRequest,
  CreatePackagePolicyResponse,
  UpdatePackagePolicyRequest,
  UpdatePackagePolicyResponse,
} from '../../types';
import type {
  DeletePackagePoliciesRequest,
  PostDeletePackagePoliciesResponse,
  GetPackagePoliciesRequest,
  GetPackagePoliciesResponse,
  GetOnePackagePolicyResponse,
  UpgradePackagePolicyDryRunResponse,
  UpgradePackagePolicyResponse,
} from '../../../common/types/rest_spec';

import { API_VERSIONS } from '../../../common/constants';

import type { RequestError } from './use_request';
import { sendRequest, sendRequestForRq, useRequest } from './use_request';

export const sendCreatePackagePolicy = (body: CreatePackagePolicyRequest['body']) => {
  return sendRequest<CreatePackagePolicyResponse>({
    path: packagePolicyRouteService.getCreatePath(),
    method: 'post',
    version: API_VERSIONS.public.v1,
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
    version: API_VERSIONS.public.v1,
    body: JSON.stringify(body),
  });
};

export const sendDeletePackagePolicy = (body: DeletePackagePoliciesRequest['body']) => {
  return sendRequest<PostDeletePackagePoliciesResponse>({
    path: packagePolicyRouteService.getDeletePath(),
    method: 'post',
    version: API_VERSIONS.public.v1,
    body: JSON.stringify(body),
  });
};

export function useGetPackagePoliciesQuery(query: GetPackagePoliciesRequest['query']) {
  return useQuery<GetPackagePoliciesResponse, RequestError>(['packagePolicies'], () =>
    sendRequestForRq<GetPackagePoliciesResponse>({
      method: 'get',
      version: API_VERSIONS.public.v1,
      path: packagePolicyRouteService.getListPath(),
      query,
    })
  );
}

export function useGetPackagePolicies(query: GetPackagePoliciesRequest['query']) {
  return useRequest<GetPackagePoliciesResponse>({
    method: 'get',
    version: API_VERSIONS.public.v1,
    path: packagePolicyRouteService.getListPath(),
    query,
  });
}

export const sendGetPackagePolicies = (query: GetPackagePoliciesRequest['query']) => {
  return sendRequest<GetPackagePoliciesResponse>({
    method: 'get',
    version: API_VERSIONS.public.v1,
    path: packagePolicyRouteService.getListPath(),
    query,
  });
};

export const useGetOnePackagePolicyQuery = (packagePolicyId: string) => {
  return useQuery<GetOnePackagePolicyResponse, RequestError>(
    ['packagePolicy', packagePolicyId],
    () =>
      sendRequestForRq<GetOnePackagePolicyResponse>({
        method: 'get',
        version: API_VERSIONS.public.v1,
        path: packagePolicyRouteService.getInfoPath(packagePolicyId),
      })
  );
};

export const useGetOnePackagePolicy = (packagePolicyId: string) => {
  return useRequest<GetOnePackagePolicyResponse>({
    path: packagePolicyRouteService.getInfoPath(packagePolicyId),
    method: 'get',
    version: API_VERSIONS.public.v1,
  });
};

export const sendGetOnePackagePolicy = (packagePolicyId: string) => {
  return sendRequest<GetOnePackagePolicyResponse>({
    path: packagePolicyRouteService.getInfoPath(packagePolicyId),
    method: 'get',
    version: API_VERSIONS.public.v1,
  });
};

export function useUpgradePackagePolicyDryRunQuery(
  packagePolicyIds: string[],
  packageVersion?: string,
  { enabled }: Partial<{ enabled: boolean }> = {}
) {
  const body: { packagePolicyIds: string[]; packageVersion?: string } = {
    packagePolicyIds,
  };

  if (packageVersion) {
    body.packageVersion = packageVersion;
  }

  return useQuery<UpgradePackagePolicyDryRunResponse, RequestError>(
    ['upgradePackagePolicyDryRun', packagePolicyIds, packageVersion],
    () =>
      sendRequestForRq<UpgradePackagePolicyDryRunResponse>({
        path: packagePolicyRouteService.getDryRunPath(),
        method: 'post',
        version: API_VERSIONS.public.v1,
        body: JSON.stringify(body),
      }),
    { enabled }
  );
}

export function sendUpgradePackagePolicyDryRun(
  packagePolicyIds: string[],
  packageVersion?: string
) {
  const body: { packagePolicyIds: string[]; packageVersion?: string } = {
    packagePolicyIds,
  };

  if (packageVersion) {
    body.packageVersion = packageVersion;
  }

  return sendRequest<UpgradePackagePolicyDryRunResponse>({
    path: packagePolicyRouteService.getDryRunPath(),
    method: 'post',
    version: API_VERSIONS.public.v1,
    body: JSON.stringify(body),
  });
}

export function useUpgradePackagePoliciesMutation() {
  return useMutation<
    UpgradePackagePolicyDryRunResponse,
    RequestError,
    { packagePolicyIds: string[] }
  >(
    ({ packagePolicyIds }) =>
      sendRequestForRq<UpgradePackagePolicyDryRunResponse>({
        path: packagePolicyRouteService.getUpgradePath(),
        method: 'post',
        version: API_VERSIONS.public.v1,
        body: JSON.stringify({
          packagePolicyIds,
        }),
      }),
    {
      retry: false,
    }
  );
}

export function sendUpgradePackagePolicy(packagePolicyIds: string[]) {
  return sendRequest<UpgradePackagePolicyResponse>({
    path: packagePolicyRouteService.getUpgradePath(),
    method: 'post',
    version: API_VERSIONS.public.v1,
    body: JSON.stringify({
      packagePolicyIds,
    }),
  });
}

export function sendGetOrphanedIntegrationPolicies() {
  return sendRequest({
    path: packagePolicyRouteService.getOrphanedIntegrationPoliciesPath(),
    method: 'get',
    version: API_VERSIONS.public.v1,
  });
}
