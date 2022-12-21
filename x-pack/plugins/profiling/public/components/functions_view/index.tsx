/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPageHeaderContentProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TypeOf } from '@kbn/typed-react-router-config';
import React from 'react';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../hooks/use_profiling_route_path';
import { useTimeRange } from '../../hooks/use_time_range';
import { useTimeRangeAsync } from '../../hooks/use_time_range_async';
import { ProfilingRoutes } from '../../routing';
import { AsyncComponent } from '../async_component';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { PrimaryAndComparisonSearchBar } from '../primary_and_comparison_search_bar';
import { ProfilingAppPageTemplate } from '../profiling_app_page_template';
import { RedirectTo } from '../redirect_to';
import { TopNFunctionsTable } from '../topn_functions';

export function FunctionsView({ children }: { children: React.ReactElement }) {
  const {
    path,
    query,
    query: { rangeFrom, rangeTo, kuery, sortDirection, sortField },
  } = useProfilingParams('/functions/*');

  const timeRange = useTimeRange({ rangeFrom, rangeTo });

  const comparisonTimeRange = useTimeRange(
    'comparisonRangeFrom' in query
      ? { rangeFrom: query.comparisonRangeFrom, rangeTo: query.comparisonRangeTo, optional: true }
      : { rangeFrom: undefined, rangeTo: undefined, optional: true }
  );

  const comparisonKuery = 'comparisonKuery' in query ? query.comparisonKuery : '';

  const {
    services: { fetchTopNFunctions },
  } = useProfilingDependencies();

  const state = useTimeRangeAsync(
    ({ http }) => {
      return fetchTopNFunctions({
        http,
        timeFrom: new Date(timeRange.start).getTime() / 1000,
        timeTo: new Date(timeRange.end).getTime() / 1000,
        startIndex: 0,
        endIndex: 100000,
        kuery,
      });
    },
    [timeRange.start, timeRange.end, kuery, fetchTopNFunctions]
  );

  const comparisonState = useTimeRangeAsync(
    ({ http }) => {
      if (!comparisonTimeRange.start || !comparisonTimeRange.end) {
        return undefined;
      }
      return fetchTopNFunctions({
        http,
        timeFrom: new Date(comparisonTimeRange.start).getTime() / 1000,
        timeTo: new Date(comparisonTimeRange.end).getTime() / 1000,
        startIndex: 0,
        endIndex: 100000,
        kuery: comparisonKuery,
      });
    },
    [comparisonTimeRange.start, comparisonTimeRange.end, comparisonKuery, fetchTopNFunctions]
  );

  const routePath = useProfilingRoutePath() as
    | '/functions'
    | '/functions/topn'
    | '/functions/differential';

  const profilingRouter = useProfilingRouter();

  const isDifferentialView = routePath === '/functions/differential';

  const tabs: Required<EuiPageHeaderContentProps>['tabs'] = [
    {
      label: i18n.translate('xpack.profiling.functionsView.functionsTabLabel', {
        defaultMessage: 'TopN functions',
      }),
      isSelected: !isDifferentialView,
      href: profilingRouter.link('/functions/topn', { query }),
    },
    {
      label: i18n.translate('xpack.profiling.functionsView.differentialFunctionsTabLabel', {
        defaultMessage: 'Differential TopN functions',
      }),
      isSelected: isDifferentialView,
      href: profilingRouter.link('/functions/differential', {
        query: {
          ...query,
          comparisonRangeFrom: query.rangeFrom,
          comparisonRangeTo: query.rangeTo,
          comparisonKuery: query.kuery,
        },
      }),
    },
  ];

  if (routePath === '/functions') {
    return <RedirectTo pathname="/functions/topn" />;
  }

  return (
    <ProfilingAppPageTemplate tabs={tabs} hideSearchBar={isDifferentialView}>
      <>
        <EuiFlexGroup direction="column">
          {isDifferentialView ? (
            <EuiFlexItem>
              <PrimaryAndComparisonSearchBar />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <EuiFlexGroup direction="row" gutterSize="s">
              <EuiFlexItem>
                <AsyncComponent {...state} size="xl" alignTop>
                  <TopNFunctionsTable
                    topNFunctions={state.data}
                    sortDirection={sortDirection}
                    sortField={sortField}
                    onSortChange={(nextSort) => {
                      profilingRouter.push(routePath, {
                        path,
                        query: {
                          ...query,
                          sortField: nextSort.sortField,
                          sortDirection: nextSort.sortDirection,
                        },
                      });
                    }}
                  />
                </AsyncComponent>
              </EuiFlexItem>
              {isDifferentialView && comparisonTimeRange.start && comparisonTimeRange.end ? (
                <EuiFlexItem>
                  <AsyncComponent {...comparisonState} size="xl" alignTop>
                    <TopNFunctionsTable
                      sortDirection={sortDirection}
                      sortField={sortField}
                      onSortChange={(nextSort) => {
                        profilingRouter.push(routePath, {
                          path,
                          query: {
                            ...(query as TypeOf<
                              ProfilingRoutes,
                              '/functions/differential'
                            >['query']),
                            sortField: nextSort.sortField,
                            sortDirection: nextSort.sortDirection,
                          },
                        });
                      }}
                      topNFunctions={comparisonState.data}
                      comparisonTopNFunctions={state.data}
                    />
                  </AsyncComponent>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        {children}
      </>
    </ProfilingAppPageTemplate>
  );
}
