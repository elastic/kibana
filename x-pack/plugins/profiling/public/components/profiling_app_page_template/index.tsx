/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPageHeaderContentProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { NoDataPageProps } from '@kbn/shared-ux-page-no-data-types';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { PrimaryProfilingSearchBar } from './primary_profiling_search_bar';

export function ProfilingAppPageTemplate({
  children,
  tabs,
  hideSearchBar = false,
  noDataConfig,
}: {
  children: React.ReactElement;
  tabs: EuiPageHeaderContentProps['tabs'];
  hideSearchBar?: boolean;
  noDataConfig?: NoDataPageProps;
}) {
  const {
    start: { observability },
  } = useProfilingDependencies();

  const { PageTemplate: ObservabilityPageTemplate } = observability.navigation;

  const history = useHistory();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [history.location.pathname]);

  return (
    <ObservabilityPageTemplate
      noDataConfig={noDataConfig}
      pageHeader={{
        pageTitle: i18n.translate('xpack.profiling.appPageTemplate.pageTitle', {
          defaultMessage: 'Universal Profiling',
        }),
        tabs,
      }}
      pageSectionProps={{
        contentProps: {
          style: {
            display: 'flex',
            flexGrow: 1,
          },
        },
      }}
    >
      <EuiFlexGroup direction="column">
        {!hideSearchBar && (
          <EuiFlexItem grow={false}>
            <PrimaryProfilingSearchBar />
          </EuiFlexItem>
        )}
        <EuiFlexItem>{children}</EuiFlexItem>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}
