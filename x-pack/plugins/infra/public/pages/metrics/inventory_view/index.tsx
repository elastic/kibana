/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { FilterBar } from './components/filter_bar';
import { SourceErrorPage } from '../../../components/source_error_page';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { useSourceContext } from '../../../containers/metrics_source';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { LayoutView } from './components/layout_view';
import { SavedViewProvider } from '../../../containers/saved_view/saved_view';
import { DEFAULT_WAFFLE_VIEW_STATE } from './hooks/use_waffle_view_state';
import { useWaffleOptionsContext } from './hooks/use_waffle_options';
import { MetricsPageTemplate } from '../page_template';
import { inventoryTitle } from '../../../translations';
import { SavedViews } from './components/saved_views';
import { SnapshotContainer } from './components/snapshot_container';
import { fullHeightContentStyles } from '../../../page_template.styles';

export const SnapshotPage = () => {
  const {
    hasFailedLoadingSource,
    isLoading,
    loadSourceFailureMessage,
    loadSource,
    source,
    metricIndicesExist,
  } = useSourceContext();
  useTrackPageview({ app: 'infra_metrics', path: 'inventory' });
  useTrackPageview({ app: 'infra_metrics', path: 'inventory', delay: 15000 });
  const { source: optionsSource } = useWaffleOptionsContext();

  useMetricsBreadcrumbs([
    {
      text: inventoryTitle,
    },
  ]);

  return (
    <EuiErrorBoundary>
      {isLoading && !source ? (
        <SourceLoadingPage />
      ) : metricIndicesExist ? (
        <>
          <div className={APP_WRAPPER_CLASS}>
            <SavedViewProvider
              shouldLoadDefault={optionsSource === 'default'}
              viewType={'inventory-view'}
              defaultViewState={DEFAULT_WAFFLE_VIEW_STATE}
            >
              <MetricsPageTemplate
                hasData={metricIndicesExist}
                pageHeader={{
                  pageTitle: inventoryTitle,
                  rightSideItems: [<SavedViews />],
                }}
                pageSectionProps={{
                  contentProps: {
                    css: fullHeightContentStyles,
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
            </SavedViewProvider>
          </div>
        </>
      ) : hasFailedLoadingSource ? (
        <SourceErrorPage errorMessage={loadSourceFailureMessage || ''} retry={loadSource} />
      ) : (
        <MetricsPageTemplate hasData={metricIndicesExist} data-test-subj="noMetricsIndicesPrompt" />
      )}
    </EuiErrorBoundary>
  );
};
