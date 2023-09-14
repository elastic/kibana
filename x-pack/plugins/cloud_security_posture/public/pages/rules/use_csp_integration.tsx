/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import {
  type CopyAgentPolicyResponse,
  type GetOnePackagePolicyResponse,
  packagePolicyRouteService,
  agentPolicyRouteService,
  API_VERSIONS,
} from '@kbn/fleet-plugin/common';
import { type PageUrlParams } from './rules_container';
import { useKibana } from '../../common/hooks/use_kibana';

export const useCspIntegrationInfo = ({ packagePolicyId, policyId }: PageUrlParams) => {
  const { http } = useKibana().services;

  return useQuery(['cspRulesInfo', { packagePolicyId, policyId }], () =>
    Promise.all([
      http
        .get<GetOnePackagePolicyResponse>(packagePolicyRouteService.getInfoPath(packagePolicyId), {
          version: API_VERSIONS.public.v1,
        })
        .then((response) => response.item),
      http
        .get<CopyAgentPolicyResponse>(agentPolicyRouteService.getInfoPath(policyId), {
          version: API_VERSIONS.public.v1,
        })
        .then((response) => response.item),
    ])
  );
};
