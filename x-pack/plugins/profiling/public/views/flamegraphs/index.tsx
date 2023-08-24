/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiPageHeaderContentProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ProfilingAppPageTemplate } from '../../components/profiling_app_page_template';
import { RedirectTo } from '../../components/redirect_to';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../hooks/use_profiling_route_path';

export function FlameGraphsView({ children }: { children: React.ReactElement }) {
  const { query } = useProfilingParams('/flamegraphs/*');
  const routePath = useProfilingRoutePath();
  const profilingRouter = useProfilingRouter();

  if (routePath === '/flamegraphs') {
    return <RedirectTo pathname="/flamegraphs/flamegraph" />;
  }

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

  return (
    <ProfilingAppPageTemplate tabs={tabs} hideSearchBar={isDifferentialView}>
      {children}
    </ProfilingAppPageTemplate>
  );
}
