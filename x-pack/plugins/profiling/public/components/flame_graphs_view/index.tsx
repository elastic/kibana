/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiPageHeaderContentProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FlameGraphComparisonMode } from '../../../common/flamegraph';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../hooks/use_profiling_route_path';
import { useTimeRange } from '../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../hooks/use_time_range_async';
import { AsyncComponent } from '../async_component';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { FlameGraph } from '../flamegraph';
import { PrimaryAndComparisonSearchBar } from '../primary_and_comparison_search_bar';
import { ProfilingAppPageTemplate } from '../profiling_app_page_template';
import { RedirectTo } from '../redirect_to';

export function FlameGraphsView({ children }: { children: React.ReactElement }) {
  const {
    path,
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
  const comparisonMode =
    'comparisonMode' in query ? query.comparisonMode : FlameGraphComparisonMode.Absolute;

  const {
    services: { fetchElasticFlamechart },
  } = useProfilingDependencies();

  const state = useTimeRangeAsync(
    ({ http }) => {
      return Promise.all([
        fetchElasticFlamechart({
          http,
          timeFrom: new Date(timeRange.start).getTime() / 1000,
          timeTo: new Date(timeRange.end).getTime() / 1000,
          kuery,
        }),
        comparisonTimeRange.start && comparisonTimeRange.end
          ? fetchElasticFlamechart({
              http,
              timeFrom: new Date(comparisonTimeRange.start).getTime() / 1000,
              timeTo: new Date(comparisonTimeRange.end).getTime() / 1000,
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
      timeRange.start,
      timeRange.end,
      kuery,
      comparisonTimeRange.start,
      comparisonTimeRange.end,
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
        query: {
          ...query,
          comparisonRangeFrom: query.rangeFrom,
          comparisonRangeTo: query.rangeTo,
          comparisonKuery: query.kuery,
          comparisonMode,
        },
      }),
    },
  ];

  if (routePath === '/flamegraphs') {
    return <RedirectTo pathname="/flamegraphs/flamegraph" />;
  }

  return (
    <ProfilingAppPageTemplate tabs={tabs} hideSearchBar={isDifferentialView}>
      <EuiFlexGroup direction="column">
        {isDifferentialView ? (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
              <EuiFlexItem grow>
                <PrimaryAndComparisonSearchBar />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  legend={i18n.translate(
                    'xpack.profiling.flameGraphsView.differentialFlameGraphComparisonModeLegend',
                    {
                      defaultMessage:
                        'This switch allows you to switch between an absolute and relative comparison between both graphs',
                    }
                  )}
                  type="single"
                  buttonSize="m"
                  idSelected={comparisonMode}
                  onChange={(nextComparisonMode) => {
                    if (!('comparisonRangeFrom' in query)) {
                      return;
                    }

                    profilingRouter.push(routePath, {
                      path,
                      query: {
                        ...query,
                        comparisonMode: nextComparisonMode as FlameGraphComparisonMode,
                      },
                    });
                  }}
                  options={[
                    {
                      id: FlameGraphComparisonMode.Absolute,
                      label: i18n.translate(
                        'xpack.profiling.flameGraphsView.differentialFlameGraphComparisonModeAbsoluteButtonLabel',
                        {
                          defaultMessage: 'Abs',
                        }
                      ),
                    },
                    {
                      id: FlameGraphComparisonMode.Relative,
                      label: i18n.translate(
                        'xpack.profiling.flameGraphsView.differentialFlameGraphComparisonModeRelativeButtonLabel',
                        {
                          defaultMessage: 'Rel',
                        }
                      ),
                    },
                  ]}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>
          <AsyncComponent {...state} style={{ height: '100%' }} size="xl">
            <FlameGraph
              id="flamechart"
              primaryFlamegraph={data?.primaryFlamegraph}
              comparisonFlamegraph={data?.comparisonFlamegraph}
              comparisonMode={comparisonMode}
            />
          </AsyncComponent>
          {children}
        </EuiFlexItem>
      </EuiFlexGroup>
    </ProfilingAppPageTemplate>
  );
}
