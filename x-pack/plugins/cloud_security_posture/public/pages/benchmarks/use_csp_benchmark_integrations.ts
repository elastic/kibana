/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import type { ListResult } from '../../../../fleet/common';
import { BENCHMARKS_ROUTE_PATH } from '../../../common/constants';
import { BenchmarksQuerySchema } from '../../../common/schemas/benchmark';
import { useKibana } from '../../common/hooks/use_kibana';
import type { Benchmark } from '../../../common/types';

const QUERY_KEY = 'csp_benchmark_integrations';

export interface UseCspBenchmarkIntegrationsProps {
  name: string;
  page: number;
  perPage: number;
  sortField: BenchmarksQuerySchema['sort_field'];
  sortOrder: BenchmarksQuerySchema['sort_order'];
}

export const useCspBenchmarkIntegrations = ({
  name,
  perPage,
  page,
  sortField,
  sortOrder,
}: UseCspBenchmarkIntegrationsProps) => {
  const { http } = useKibana().services;
  const query: BenchmarksQuerySchema = {
    benchmark_name: name,
    per_page: perPage,
    page,
    sort_field: sortField,
    sort_order: sortOrder,
  };

  return useQuery(
    [QUERY_KEY, { name, perPage, page, sortField, sortOrder }],
    () => http.get<ListResult<Benchmark>>(BENCHMARKS_ROUTE_PATH, { query }),
    { keepPreviousData: true }
  );
};
