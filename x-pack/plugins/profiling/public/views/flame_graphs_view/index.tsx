/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPageHeaderContentProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import React, { useState } from 'react';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../hooks/use_profiling_route_path';
import { useTimeRange } from '../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../hooks/use_time_range_async';
import { AsyncComponent } from '../../components/async_component';
import { useProfilingDependencies } from '../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { FlameGraph } from '../../components/flamegraph';
import { ProfilingAppPageTemplate } from '../../components/profiling_app_page_template';
import { RedirectTo } from '../../components/redirect_to';
import { FlameGraphSearchPanel } from './flame_graph_search_panel';
import {
  ComparisonMode,
  NormalizationMode,
  NormalizationOptions,
} from '../../components/normalization_menu';

export function FlameGraphsView({ children }: { children: React.ReactElement }) {
  const {
    query,
    query: { rangeFrom, rangeTo, kuery },
  } = useProfilingParams('/flamegraphs/*');

  const timeRange = useTimeRange({ rangeFrom, rangeTo });

  const comparisonTimeRange = useTimeRange(
    'comparisonRangeFrom' in query
      ? { rangeFrom: query.comparisonRangeFrom, rangeTo: query.comparisonRangeTo, optional: true }
      : { rangeFrom: undefined, rangeTo: undefined, optional: true }
  );

  const comparisonKuery = 'comparisonKuery' in query ? query.comparisonKuery : '';
  const comparisonMode = 'comparisonMode' in query ? query.comparisonMode : ComparisonMode.Absolute;

  const normalizationMode: NormalizationMode = get(
    query,
    'normalizationMode',
    NormalizationMode.Time
  );

  const baselineScale: number = get(query, 'baseline', 1);
  const comparisonScale: number = get(query, 'comparison', 1);

  const totalSeconds = timeRange.inSeconds.end - timeRange.inSeconds.start;
  const totalComparisonSeconds =
    (new Date(comparisonTimeRange.end!).getTime() -
      new Date(comparisonTimeRange.start!).getTime()) /
    1000;

  const baselineTime = 1;
  const comparisonTime = totalSeconds / totalComparisonSeconds;

  const normalizationOptions: NormalizationOptions = {
    baselineScale,
    baselineTime,
    comparisonScale,
    comparisonTime,
  };

  const {
    services: { fetchElasticFlamechart },
  } = useProfilingDependencies();

  const state = useTimeRangeAsync(
    ({ http }) => {
      return Promise.all([
        fetchElasticFlamechart({
          http,
          timeFrom: timeRange.inSeconds.start,
          timeTo: timeRange.inSeconds.end,
          kuery,
        }),
        comparisonTimeRange.inSeconds.start && comparisonTimeRange.inSeconds.end
          ? fetchElasticFlamechart({
              http,
              timeFrom: comparisonTimeRange.inSeconds.start,
              timeTo: comparisonTimeRange.inSeconds.end,
              kuery: comparisonKuery,
            })
          : Promise.resolve(undefined),
      ]).then(([primaryFlamegraph, comparisonFlamegraph]) => {
        return {
          primaryFlamegraph,
          comparisonFlamegraph,
        };
      });
    },
    [
      timeRange.inSeconds.start,
      timeRange.inSeconds.end,
      kuery,
      comparisonTimeRange.inSeconds.start,
      comparisonTimeRange.inSeconds.end,
      comparisonKuery,
      fetchElasticFlamechart,
    ]
  );

  const { data } = state;

  const routePath = useProfilingRoutePath();

  const profilingRouter = useProfilingRouter();

  const isDifferentialView = routePath === '/flamegraphs/differential';

  const tabs: Required<EuiPageHeaderContentProps>['tabs'] = [
    {
      label: i18n.translate('xpack.profiling.flameGraphsView.flameGraphTabLabel', {
        defaultMessage: 'Flamegraph',
      }),
      isSelected: !isDifferentialView,
      href: profilingRouter.link('/flamegraphs/flamegraph', { query }),
    },
    {
      label: i18n.translate('xpack.profiling.flameGraphsView.differentialFlameGraphTabLabel', {
        defaultMessage: 'Differential flamegraph',
      }),
      isSelected: isDifferentialView,
      href: profilingRouter.link('/flamegraphs/differential', {
        // @ts-expect-error Code gets too complicated to satisfy TS constraints
        query: {
          ...query,
          comparisonRangeFrom: query.rangeFrom,
          comparisonRangeTo: query.rangeTo,
          comparisonKuery: query.kuery,
        },
      }),
    },
  ];

  const [showInformationWindow, setShowInformationWindow] = useState(false);
  function toggleShowInformationWindow() {
    setShowInformationWindow((prev) => !prev);
  }

  if (routePath === '/flamegraphs') {
    return <RedirectTo pathname="/flamegraphs/flamegraph" />;
  }

  const isNormalizedByTime = normalizationMode === NormalizationMode.Time;

  return (
    <ProfilingAppPageTemplate tabs={tabs} hideSearchBar={true}>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <FlameGraphSearchPanel
            isDifferentialView={isDifferentialView}
            comparisonMode={comparisonMode}
            normalizationMode={normalizationMode}
            normalizationOptions={normalizationOptions}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <AsyncComponent {...state} style={{ height: '100%' }} size="xl">
            <FlameGraph
              id="flamechart"
              primaryFlamegraph={data?.primaryFlamegraph}
              comparisonFlamegraph={data?.comparisonFlamegraph}
              comparisonMode={comparisonMode}
              baseline={isNormalizedByTime ? baselineTime : baselineScale}
              comparison={isNormalizedByTime ? comparisonTime : comparisonScale}
              showInformationWindow={showInformationWindow}
              toggleShowInformationWindow={toggleShowInformationWindow}
            />
          </AsyncComponent>
          {children}
        </EuiFlexItem>
      </EuiFlexGroup>
    </ProfilingAppPageTemplate>
  );
}
