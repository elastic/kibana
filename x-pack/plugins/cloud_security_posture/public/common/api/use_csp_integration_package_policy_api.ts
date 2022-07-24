/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import {
  packagePolicyRouteService,
  type GetPackagePoliciesResponse,
} from '@kbn/fleet-plugin/common';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '../../../common/constants';
import { useKibana } from '../hooks/use_kibana';

/**
 * This hook will find the Cloud Posture cis integration and return its package policy
 * */
export const useCspIntegrationPackagePolicyApi = () => {
  const { http } = useKibana().services;

  const policies = useQuery('test', () => http.get(packagePolicyRouteService.getListPath()));
  console.log({ policies });
  const policy = useQuery('test2', () =>
    http.get(packagePolicyRouteService.getInfoPath('ca7c73d4-fa72-46c3-9db5-71db04ee8120'))
  );
  console.log({ policy });

  return useQuery<GetPackagePoliciesResponse>(['csp-cis-integration-package-policy'], () =>
    http.get<GetPackagePoliciesResponse>(
      packagePolicyRouteService.getInfoPath(CLOUD_SECURITY_POSTURE_PACKAGE_NAME),
      { query: { experimental: true } }
    )
  );
};
