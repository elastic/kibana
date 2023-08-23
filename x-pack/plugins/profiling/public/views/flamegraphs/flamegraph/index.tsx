/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useUiTracker } from '@kbn/observability-shared-plugin/public';
import { FlameGraph } from '@kbn/profiling-shared-ui';
import React from 'react';
import { AsyncComponent } from '../../../components/async_component';
import { useProfilingDependencies } from '../../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { useProfilingParams } from '../../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../../hooks/use_profiling_route_path';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../../hooks/use_time_range_async';

export function FlameGraphView() {
  const {
    query,
    query: { rangeFrom, rangeTo, kuery, searchText },
  } = useProfilingParams('/flamegraphs/flamegraph');
  const trackProfilingEvent = useUiTracker({ app: 'profiling' });

  const timeRange = useTimeRange({ rangeFrom, rangeTo });

  const {
    services: { fetchElasticFlamechart },
    start: {
      core: { docLinks },
    },
  } = useProfilingDependencies();

  const state = useTimeRangeAsync(
    ({ http }) => {
      return fetchElasticFlamechart({
        http,
        timeFrom: timeRange.inSeconds.start,
        timeTo: timeRange.inSeconds.end,
        kuery,
      });
    },
    [timeRange.inSeconds.start, timeRange.inSeconds.end, kuery, fetchElasticFlamechart]
  );

  const { data } = state;

  const routePath = useProfilingRoutePath();

  const profilingRouter = useProfilingRouter();

  function handleSearchTextChange(newSearchText: string) {
    // @ts-expect-error Code gets too complicated to satisfy TS constraints
    profilingRouter.push(routePath, { query: { ...query, searchText: newSearchText } });
  }

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <AsyncComponent {...state} style={{ height: '100%' }} size="xl">
          <FlameGraph
            data={data}
            id="profiling-flamechart"
            searchText={searchText}
            onSearchTextChange={handleSearchTextChange}
            onShowInformationWindowOpen={() => {
              trackProfilingEvent({ metric: 'flamegraph_node_details_click' });
            }}
            elasticWebsiteUrl={docLinks.ELASTIC_WEBSITE_URL}
            dockLinkVersion={docLinks.DOC_LINK_VERSION}
            onUploadSymbolsClick={(selectedTab) => {
              profilingRouter.push('/add-data-instructions', {
                path: {},
                query: { selectedTab },
              });
            }}
          />
        </AsyncComponent>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
