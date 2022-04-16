/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext } from 'react';
import { useTrackPageview } from '@kbn/observability-plugin/public';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { FilterBar } from './components/filter_bar';

import { DocumentTitle } from '../../../components/document_title';

import { SourceErrorPage } from '../../../components/source_error_page';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { Source } from '../../../containers/metrics_source';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { LayoutView } from './components/layout_view';
import { SavedViewProvider } from '../../../containers/saved_view/saved_view';
import { DEFAULT_WAFFLE_VIEW_STATE } from './hooks/use_waffle_view_state';
import { useWaffleOptionsContext } from './hooks/use_waffle_options';
import { MetricsPageTemplate } from '../page_template';
import { inventoryTitle } from '../../../translations';
import { SavedViews } from './components/saved_views';
import { SnapshotContainer } from './components/snapshot_container';

export const SnapshotPage = () => {
  const {
    hasFailedLoadingSource,
    isLoading,
    loadSourceFailureMessage,
    loadSource,
    source,
    metricIndicesExist,
  } = useContext(Source.Context);
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
      <DocumentTitle
        title={(previousTitle: string) =>
          i18n.translate('xpack.infra.infrastructureSnapshotPage.documentTitle', {
            defaultMessage: '{previousTitle} | Inventory',
            values: {
              previousTitle,
            },
          })
        }
      />
      {isLoading && !source ? (
        <SourceLoadingPage />
      ) : metricIndicesExist ? (
        <>
          <InventoryPageWrapper className={APP_WRAPPER_CLASS}>
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
                pageBodyProps={{
                  paddingSize: 'none',
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
          </InventoryPageWrapper>
        </>
      ) : hasFailedLoadingSource ? (
        <SourceErrorPage errorMessage={loadSourceFailureMessage || ''} retry={loadSource} />
      ) : (
        <MetricsPageTemplate hasData={metricIndicesExist} data-test-subj="noMetricsIndicesPrompt" />
      )}
    </EuiErrorBoundary>
  );
};

// This is added to facilitate a full height layout whereby the
// inner container will set it's own height and be scrollable.
// The "fullHeight" prop won't help us as it only applies to certain breakpoints.
export const InventoryPageWrapper = euiStyled.div`
  .euiPage .euiPageContentBody {
    display: flex;
    flex-direction: column;
    flex: 1 0 auto;
    width: 100%;
    height: 100%;
  }
`;
