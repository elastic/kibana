/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useKibana } from '../hooks/use_kibana';
import { ComplianceDashboardData, PosturePolicyTemplate } from '../../../common/types';
import {
  CSPM_POLICY_TEMPLATE,
  KSPM_POLICY_TEMPLATE,
  STATS_ROUTE_PATH,
} from '../../../common/constants';

// TODO: consolidate both hooks into one hook with a dynamic key
const getCspmStatsKey = ['csp_cspm_dashboard_stats'];
const getKspmStatsKey = ['csp_kspm_dashboard_stats'];

export const getStatsRoute = (policyTemplate: PosturePolicyTemplate) => {
  return STATS_ROUTE_PATH.replace('{policy_template}', policyTemplate);
};

export const useCspmStatsApi = (
  options: UseQueryOptions<unknown, unknown, ComplianceDashboardData, string[]>
) => {
  const { http } = useKibana().services;
  return useQuery(
    getCspmStatsKey,
    () => http.get<ComplianceDashboardData>(getStatsRoute(CSPM_POLICY_TEMPLATE)),
    options
  );
};

export const useKspmStatsApi = (
  options: UseQueryOptions<unknown, unknown, ComplianceDashboardData, string[]>
) => {
  const { http } = useKibana().services;
  return useQuery(
    getKspmStatsKey,
    () => http.get<ComplianceDashboardData>(getStatsRoute(KSPM_POLICY_TEMPLATE)),
    options
  );
};
