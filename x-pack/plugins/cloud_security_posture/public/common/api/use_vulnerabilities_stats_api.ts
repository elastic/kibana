/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { CnvmDashboardData } from '../../../common/types';
import { useKibana } from '../hooks/use_kibana';
import { VULNERABILITIES_STATS_ROUTE_PATH } from '../../../common/constants';

const cnvmKey = 'use-cnvm-statistics-api-key';

export const useCnvmStatisticsApi = (
  options?: UseQueryOptions<unknown, unknown, CnvmDashboardData, string[]>
) => {
  const { http } = useKibana().services;
  return useQuery(
    [cnvmKey],
    () => http.get<CnvmDashboardData>(VULNERABILITIES_STATS_ROUTE_PATH),
    options
  );
};
