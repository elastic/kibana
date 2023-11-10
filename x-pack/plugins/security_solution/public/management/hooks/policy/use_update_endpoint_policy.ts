/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useMutation } from '@tanstack/react-query';
import { packagePolicyRouteService, API_VERSIONS } from '@kbn/fleet-plugin/common';
import { getPolicyDataForUpdate } from '../../../../common/endpoint/service/policy';
import { useHttp } from '../../../common/lib/kibana';
import type { PolicyData } from '../../../../common/endpoint/types';
import type { UpdatePolicyResponse } from '../../pages/policy/types';

interface UpdateParams {
  policy: PolicyData;
}

export type UseUpdateEndpointPolicyOptions = Omit<
  UseMutationOptions<UpdatePolicyResponse, IHttpFetchError, UpdateParams>,
  'mutationFn'
>;

export type UseUpdateEndpointPolicyResult = UseMutationResult<
  UpdatePolicyResponse,
  IHttpFetchError,
  UpdateParams
>;

export const useUpdateEndpointPolicy = (
  options?: UseUpdateEndpointPolicyOptions
): UseUpdateEndpointPolicyResult => {
  const http = useHttp();

  return useMutation<UpdatePolicyResponse, IHttpFetchError, UpdateParams>(({ policy }) => {
    const update = getPolicyDataForUpdate(policy);

    return http.put(packagePolicyRouteService.getUpdatePath(policy.id), {
      body: JSON.stringify(update),
      version: API_VERSIONS.public.v1,
    });
  }, options);
};
