/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useKibana } from '../hooks/use_kibana';
import { PosturePolicyTemplate, ComplianceDashboardData } from '../../../common/types';
import { STATS_ROUTE_PATH } from '../../../common/constants';

export const getStatsRoute = (policyTemplate: PosturePolicyTemplate) => {
  return STATS_ROUTE_PATH.replace('{policy_template}', policyTemplate);
};

export const useStatsApi = (
  postureType: PosturePolicyTemplate,
  options: UseQueryOptions<
    unknown,
    unknown,
    ComplianceDashboardData,
    Array<string | { postureType: PosturePolicyTemplate }>
  >
) => {
  const { http } = useKibana().services;
  return useQuery(
    ['csp_dashboard_stats', { postureType }],
    () => http.get<ComplianceDashboardData>(getStatsRoute(postureType)),
    options
  );
};
