/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { PrimaryProfilingSearchBar } from './profiling_app_page_template/primary_profiling_search_bar';
import { ProfilingSearchBar } from './profiling_app_page_template/profiling_search_bar';
import { useAnyOfProfilingParams } from '../hooks/use_profiling_params';
import { useProfilingRouter } from '../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../hooks/use_profiling_route_path';

export function PrimaryAndComparisonSearchBar() {
  const {
    path,
    query,
    query: { comparisonKuery, comparisonRangeFrom, comparisonRangeTo },
  } = useAnyOfProfilingParams('/flamegraphs/differential', '/functions/differential');

  const profilingRouter = useProfilingRouter();
  const routePath = useProfilingRoutePath() as
    | '/flamegraphs/differential'
    | '/functions/differential';

  return (
    <EuiFlexGroup direction="row" gutterSize="xs">
      <EuiFlexItem>
        <PrimaryProfilingSearchBar />
      </EuiFlexItem>
      <EuiFlexItem>
        <ProfilingSearchBar
          kuery={comparisonKuery}
          rangeFrom={comparisonRangeFrom}
          rangeTo={comparisonRangeTo}
          onQuerySubmit={(next) => {
            profilingRouter.push(routePath, {
              path,
              query: {
                ...query,
                comparisonKuery: String(next.query?.query || ''),
                comparisonRangeFrom: next.dateRange.from,
                comparisonRangeTo: next.dateRange.to,
              },
            });
          }}
          onRefresh={(nextDateRange) => {
            profilingRouter.push(routePath, {
              path,
              query: {
                ...query,
                comparisonRangeFrom: nextDateRange.dateRange.from,
                comparisonRangeTo: nextDateRange.dateRange.to,
              },
            });
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
