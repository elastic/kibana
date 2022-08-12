/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPageHeaderContentProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { ElasticFlameGraph } from '../../../common/flamegraph';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../hooks/use_profiling_route_path';
import { useTimeRange } from '../../hooks/use_time_range';
import { FlameGraphContext } from '../contexts/flamegraph';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { FlameGraph } from '../flamegraph';
import { FlameGraphNavigation } from '../flamegraph_nav';
import { PrimaryAndComparisonSearchBar } from '../primary_and_comparison_search_bar';
import { ProfilingAppPageTemplate } from '../profiling_app_page_template';
import { RedirectTo } from '../redirect_to';

export function FlameGraphsView({ children }: { children: React.ReactElement }) {
  const {
    query,
    query: { rangeFrom, rangeTo, kuery },
  } = useProfilingParams('/flamegraphs/*');

  const timeRange = useTimeRange({ rangeFrom, rangeTo });

  const [elasticFlamegraph, setElasticFlamegraph] = useState<ElasticFlameGraph>();

  const {
    services: { fetchElasticFlamechart },
  } = useProfilingDependencies();

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
        },
      }),
    },
  ];

  if (routePath === '/flamegraphs') {
    return <RedirectTo pathname="/flamegraphs/flamegraph" />;
  }

  return (
    <ProfilingAppPageTemplate tabs={tabs} hideSearchBar={isDifferentialView}>
      <FlameGraphContext.Provider value={elasticFlamegraph}>
        <EuiFlexGroup direction="column">
          {isDifferentialView ? (
            <EuiFlexItem>
              <PrimaryAndComparisonSearchBar />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <FlameGraphNavigation
              timeRange={timeRange}
              kuery={kuery}
              getter={fetchElasticFlamechart}
              setter={setElasticFlamegraph}
            />
            <FlameGraph id="flamechart" height={600} />
            {children}
          </EuiFlexItem>
        </EuiFlexGroup>
      </FlameGraphContext.Provider>
    </ProfilingAppPageTemplate>
  );
}
