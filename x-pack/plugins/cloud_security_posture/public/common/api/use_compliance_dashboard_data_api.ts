/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type QueryObserverOptions, useQuery } from '@tanstack/react-query';
import { useKibana } from '../hooks/use_kibana';
import { ComplianceDashboardData } from '../../../common/types';
import { STATS_ROUTE_PATH } from '../../../common/constants';

const getStatsKey = ['csp_dashboard_stats'];

export const useComplianceDashboardDataApi = (
  options: QueryObserverOptions<unknown, unknown, ComplianceDashboardData, unknown, string[]>
) => {
  const { http } = useKibana().services;
  return useQuery(getStatsKey, () => http.get<ComplianceDashboardData>(STATS_ROUTE_PATH), options);
};
