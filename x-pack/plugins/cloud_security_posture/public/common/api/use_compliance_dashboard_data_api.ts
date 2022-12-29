/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type QueryObserverOptions, useQuery } from '@tanstack/react-query';
import { useKibana } from '../hooks/use_kibana';
import { ComplianceDashboardData } from '../../../common/types';
import { POLICY_TEMPLATE, STATS_ROUTE_PATH } from '../../../common/constants';

const getCspmStatsKey = ['csp_cspm_dashboard_stats'];
const getKspmStatsKey = ['csp_kspm_dashboard_stats'];

export const getStatsRoute = (policyTemplate: POLICY_TEMPLATE) => {
  return STATS_ROUTE_PATH.replace('{policy_template}', policyTemplate);
};

export const useCspmComplianceDashboardDataApi = (
  options: QueryObserverOptions<unknown, unknown, ComplianceDashboardData, unknown, string[]>
) => {
  const { http } = useKibana().services;
  return useQuery(
    getCspmStatsKey,
    // TODO: remove casting and use actual policy template
    () => http.get<ComplianceDashboardData>(getStatsRoute('cis_aws' as POLICY_TEMPLATE)),
    options
  );
};

export const useKspmComplianceDashboardDataApi = (
  options: QueryObserverOptions<unknown, unknown, ComplianceDashboardData, unknown, string[]>
) => {
  const { http } = useKibana().services;
  return useQuery(
    getKspmStatsKey,
    // TODO: remove casting and use actual policy template
    () => http.get<ComplianceDashboardData>(getStatsRoute('cis_k8s' as POLICY_TEMPLATE)),
    options
  );
};
