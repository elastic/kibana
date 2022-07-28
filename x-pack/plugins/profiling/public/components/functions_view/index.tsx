/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiPageHeaderContentProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { TopNFunctions } from '../../../common/functions';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../hooks/use_profiling_route_path';
import { useTimeRange } from '../../hooks/use_time_range';
import { FunctionContext } from '../contexts/function';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { FunctionNavigation } from '../function_nav';
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

  const tabs: Required<EuiPageHeaderContentProps>['tabs'] = [
    {
      label: i18n.translate('xpack.profiling.functionsView.functionsTabLabel', {
        defaultMessage: 'TopN functions',
      }),
      isSelected: routePath === '/functions/topn',
      href: profilingRouter.link('/functions/topn', { query }),
    },
    {
      label: i18n.translate('xpack.profiling.functionsView.differentialFunctionsTabLabel', {
        defaultMessage: 'Differential TopN functions',
      }),
      isSelected: routePath === '/functions/differential',
      href: profilingRouter.link('/functions/differential', { query }),
    },
  ];

  return (
    <ProfilingAppPageTemplate tabs={tabs}>
      <FunctionContext.Provider value={topnFunctions}>
        <FunctionNavigation
          timeRange={timeRange}
          kuery={kuery}
          getter={fetchTopNFunctions}
          setter={setTopNFunctions}
        />
        <TopNFunctionsTable />
        {children}
      </FunctionContext.Provider>
    </ProfilingAppPageTemplate>
  );
}
