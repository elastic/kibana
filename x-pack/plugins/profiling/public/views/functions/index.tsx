/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageHeaderContentProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { TopNComparisonFunctionSortField } from '@kbn/profiling-utils';
import { NormalizationMode } from '../../components/normalization_menu';
import { ProfilingAppPageTemplate } from '../../components/profiling_app_page_template';
import { RedirectTo } from '../../components/redirect_to';
import { useProfilingParams } from '../../hooks/use_profiling_params';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useProfilingRoutePath } from '../../hooks/use_profiling_route_path';

export function FunctionsView({ children }: { children: React.ReactElement }) {
  const { query } = useProfilingParams('/functions/*');
  const routePath = useProfilingRoutePath() as
    | '/functions'
    | '/functions/topn'
    | '/functions/differential';

  const profilingRouter = useProfilingRouter();

  if (routePath === '/functions') {
    return <RedirectTo pathname="/functions/topn" />;
  }

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
          normalizationMode:
            'normalizationMode' in query ? query.normalizationMode : NormalizationMode.Time,
          comparisonSortField:
            'comparisonSortField' in query
              ? query.comparisonSortField
              : TopNComparisonFunctionSortField.ComparisonRank,
          comparisonSortDirection:
            'comparisonSortDirection' in query ? query.comparisonSortDirection : 'asc',
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
