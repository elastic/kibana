/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPageHeaderContentProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';
import { TopNFunctions } from '../../../common/functions';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../hooks/use_profiling_route_path';
import { useTimeRange } from '../../hooks/use_time_range';
import { FunctionContext } from '../contexts/function';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { FunctionNavigation } from '../function_nav';
import { PrimaryAndComparisonSearchBar } from '../primary_and_comparison_search_bar';
import { ProfilingAppPageTemplate } from '../profiling_app_page_template';
import { TopNFunctionsTable } from '../topn_functions';

export function FunctionsView({ children }: { children: React.ReactElement }) {
  const {
    query,
    query: { rangeFrom, rangeTo, kuery },
  } = useProfilingParams('/functions/*');

  const timeRange = useTimeRange({ rangeFrom, rangeTo });

  const [topnFunctions, setTopNFunctions] = useState<TopNFunctions>();

  const {
    services: { fetchTopNFunctions },
  } = useProfilingDependencies();

  const routePath = useProfilingRoutePath();

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
    return <Redirect to="/functions/topn" />;
  }

  return (
    <ProfilingAppPageTemplate tabs={tabs} hideSearchBar={isDifferentialView}>
      <FunctionContext.Provider value={topnFunctions}>
        <EuiFlexGroup direction="column">
          {isDifferentialView ? (
            <EuiFlexItem>
              <PrimaryAndComparisonSearchBar />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <FunctionNavigation
              timeRange={timeRange}
              kuery={kuery}
              getter={fetchTopNFunctions}
              setter={setTopNFunctions}
            />
            <TopNFunctionsTable />
            {children}
          </EuiFlexItem>
        </EuiFlexGroup>
      </FunctionContext.Provider>
    </ProfilingAppPageTemplate>
  );
}
