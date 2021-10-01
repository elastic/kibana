/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiErrorBoundary, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext } from 'react';
import { FilterBar } from './components/filter_bar';

import { DocumentTitle } from '../../../components/document_title';
import { NoIndices } from '../../../components/empty_states/no_indices';

import { SourceErrorPage } from '../../../components/source_error_page';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { ViewSourceConfigurationButton } from '../../../components/source_configuration/view_source_configuration_button';
import { Source } from '../../../containers/metrics_source';
import { useTrackPageview } from '../../../../../observability/public';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { LayoutView } from './components/layout_view';
import { useLinkProps } from '../../../hooks/use_link_props';
import { SavedViewProvider } from '../../../containers/saved_view/saved_view';
import { DEFAULT_WAFFLE_VIEW_STATE } from './hooks/use_waffle_view_state';
import { useWaffleOptionsContext } from './hooks/use_waffle_options';
import { MetricsPageTemplate } from '../page_template';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { APP_WRAPPER_CLASS } from '../../../../../../../src/core/public';
import { inventoryTitle } from '../../../translations';
import { SavedViews } from './components/saved_views';

export const SnapshotPage = () => {
  const uiCapabilities = useKibana().services.application?.capabilities;
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

  const tutorialLinkProps = useLinkProps({
    app: 'home',
    hash: '/tutorial_directory/metrics',
  });

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
                pageHeader={{
                  pageTitle: inventoryTitle,
                  rightSideItems: [<SavedViews />],
                }}
                pageBodyProps={{
                  paddingSize: 'none',
                }}
              >
                <FilterBar />
                <LayoutView />
              </MetricsPageTemplate>
            </SavedViewProvider>
          </InventoryPageWrapper>
        </>
      ) : hasFailedLoadingSource ? (
        <SourceErrorPage errorMessage={loadSourceFailureMessage || ''} retry={loadSource} />
      ) : (
        <NoIndices
          title={i18n.translate('xpack.infra.homePage.noMetricsIndicesTitle', {
            defaultMessage: "Looks like you don't have any metrics indices.",
          })}
          message={i18n.translate('xpack.infra.homePage.noMetricsIndicesDescription', {
            defaultMessage: "Let's add some!",
          })}
          actions={
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiButton
                  {...tutorialLinkProps}
                  color="primary"
                  fill
                  data-test-subj="infrastructureViewSetupInstructionsButton"
                >
                  {i18n.translate('xpack.infra.homePage.noMetricsIndicesInstructionsActionLabel', {
                    defaultMessage: 'View setup instructions',
                  })}
                </EuiButton>
              </EuiFlexItem>
              {uiCapabilities?.infrastructure?.configureSource ? (
                <EuiFlexItem>
                  <ViewSourceConfigurationButton
                    app="metrics"
                    data-test-subj="configureSourceButton"
                  >
                    {i18n.translate('xpack.infra.configureSourceActionLabel', {
                      defaultMessage: 'Change source configuration',
                    })}
                  </ViewSourceConfigurationButton>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          }
          data-test-subj="noMetricsIndicesPrompt"
        />
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
