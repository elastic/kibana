/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { useQuery } from '@tanstack/react-query';
import { packagePolicyRouteService } from '@kbn/fleet-plugin/common';
import type { GetPolicyResponse } from '../../pages/policy/types';
import { useHttp } from '../../../common/lib/kibana';
import type { PolicyData, PolicyConfig } from '../../../../common/endpoint/types';
import type { ManifestSchema } from '../../../../common/endpoint/schema/manifest';

interface ApiDataResponse {
  /** Data return from the Fleet API. Its the full integration policy (package policy) */
  item: PolicyData;
  /** Endpoint policy settings from the data retrieved from fleet */
  settings: PolicyConfig;
  /** Endpoint policy manifest info from the data retrieved from fleet */
  artifactManifest: ManifestSchema;
}

type UseFetchEndpointPolicyResponse = UseQueryResult<ApiDataResponse, IHttpFetchError>;

/**
 * Retrieve a single endpoint integration policy (details)
 * @param policyId
 * @param options
 */
export const useFetchEndpointPolicy = (
  policyId: string,
  options: UseQueryOptions<ApiDataResponse, IHttpFetchError> = {}
): UseFetchEndpointPolicyResponse => {
  const http = useHttp();

  return useQuery<ApiDataResponse, IHttpFetchError>({
    queryKey: ['get-policy-details', policyId],
    ...options,
    queryFn: async () => {
      const apiResponse = await http.get<GetPolicyResponse>(
        packagePolicyRouteService.getInfoPath(policyId)
      );

      return {
        item: apiResponse.item,
        settings: apiResponse.item.inputs[0].config.policy.value,
        artifactManifest: apiResponse.item.inputs[0].config.artifact_manifest.value,
      };
    },
  });
};
