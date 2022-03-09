/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { QueryObserverResult, useQuery } from 'react-query';
import {
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  GetAgentPoliciesResponse,
} from '../../../../../fleet/common';
import { useHttp } from '../../../common/lib/kibana/hooks';
import { ServerApiError } from '../../../common/types';
import { MANAGEMENT_DEFAULT_PAGE_SIZE } from '../../common/constants';
import { sendGetAgentPolicyList } from '../../pages/policy/store/services/ingest';
import { GetPolicyListResponse } from '../../pages/policy/types';
import { sendGetEndpointSpecificPackagePolicies } from './policies';

export function useGetEndpointSpecificPolicies(
  {
    onError,
    page,
    perPage,
  }: {
    onError?: (error: ServerApiError) => void;
    page?: number;
    perPage?: number;
  } = { page: 1, perPage: MANAGEMENT_DEFAULT_PAGE_SIZE }
): QueryObserverResult<GetPolicyListResponse> {
  const http = useHttp();
  return useQuery<GetPolicyListResponse, ServerApiError>(
    ['endpointSpecificPolicies', page, perPage],
    () => {
      return sendGetEndpointSpecificPackagePolicies(http, {
        query: {
          page,
          perPage,
        },
      });
    },
    {
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      onError,
    }
  );
}

export function useGetAgentCountForPolicy({
  onError,
  policyIds,
}: {
  onError?: (error: ServerApiError) => void;
  policyIds: string[];
}): QueryObserverResult<GetAgentPoliciesResponse> {
  // is there a more elegant way to do this? w/o the conditional, the call is a bad request when the policyId is empty
  const http = useHttp();
  return useQuery<GetAgentPoliciesResponse, ServerApiError>(
    ['endpointCountForPolicy', policyIds],
    () => {
      if (policyIds.length > 0) {
        return sendGetAgentPolicyList(http, {
          query: {
            perPage: 50,
            kuery: `${AGENT_POLICY_SAVED_OBJECT_TYPE}.package_policies: (${policyIds.join(
              ' or '
            )})`,
          },
        });
      }
      return sendGetAgentPolicyList(http, { query: {} });
    },
    {
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: false,
      onError,
    }
  );
}
