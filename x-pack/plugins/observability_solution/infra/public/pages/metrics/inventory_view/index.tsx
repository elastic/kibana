/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { css } from '@emotion/react';
import { FilterBar } from './components/filter_bar';
import { SourceErrorPage } from '../../../components/source_error_page';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { useSourceContext } from '../../../containers/metrics_source';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { LayoutView } from './components/layout_view';
import { MetricsPageTemplate } from '../page_template';
import { inventoryTitle } from '../../../translations';
import { SavedViews } from './components/saved_views';
import { SnapshotContainer } from './components/snapshot_container';
import { fullHeightContentStyles } from '../../../page_template.styles';
import { SurveySection } from './components/survey_section';
import { NoRemoteCluster } from '../../../components/empty_states';
import { WaffleOptionsProvider } from './hooks/use_waffle_options';
import { WaffleTimeProvider } from './hooks/use_waffle_time';
import { WaffleFiltersProvider } from './hooks/use_waffle_filters';

export const SnapshotPage = () => {
  const { isLoading, loadSourceFailureMessage, loadSource, source } = useSourceContext();

  useTrackPageview({ app: 'infra_metrics', path: 'inventory' });
  useTrackPageview({ app: 'infra_metrics', path: 'inventory', delay: 15000 });

  useMetricsBreadcrumbs([
    {
      text: inventoryTitle,
    },
  ]);

  const { metricIndicesExist, remoteClustersExist } = source?.status ?? {};

  if (isLoading && !source) return <SourceLoadingPage />;

  if (!remoteClustersExist) {
    return <NoRemoteCluster />;
  }

  if (!metricIndicesExist) {
    return (
      <MetricsPageTemplate hasData={metricIndicesExist} data-test-subj="noMetricsIndicesPrompt" />
    );
  }

  if (loadSourceFailureMessage)
    return <SourceErrorPage errorMessage={loadSourceFailureMessage || ''} retry={loadSource} />;

  return (
    <EuiErrorBoundary>
      <WaffleOptionsProvider>
        <WaffleTimeProvider>
          <WaffleFiltersProvider>
            <div className={APP_WRAPPER_CLASS}>
              <MetricsPageTemplate
                hasData={metricIndicesExist}
                pageHeader={{
                  pageTitle: inventoryTitle,
                  rightSideItems: [<SavedViews />, <SurveySection />],
                }}
                pageSectionProps={{
                  contentProps: {
                    css: css`
                      ${fullHeightContentStyles};
                      padding-bottom: 0;
                    `,
                  },
                }}
              >
                <SnapshotContainer
                  render={({ loading, nodes, reload, interval }) => (
                    <>
                      <FilterBar interval={interval} />
                      <LayoutView
                        loading={loading}
                        nodes={nodes}
                        reload={reload}
                        interval={interval}
                      />
                    </>
                  )}
                />
              </MetricsPageTemplate>
            </div>
          </WaffleFiltersProvider>
        </WaffleTimeProvider>
      </WaffleOptionsProvider>
    </EuiErrorBoundary>
  );
};
