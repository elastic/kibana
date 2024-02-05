/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React, { useRef } from 'react';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { css } from '@emotion/react';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { ItemTypeRT } from '@kbn/metrics-data-access-plugin/common';
import { FilterBar } from './components/filter_bar';
import { SourceErrorPage } from '../../../components/source_error_page';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { useSourceContext } from '../../../containers/metrics_source';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { MetricsPageTemplate } from '../page_template';
import { inventoryTitle } from '../../../translations';
import { SnapshotContainer } from './components/snapshot_container';
import { fullHeightContentStyles } from '../../../page_template.styles';
import { SurveySection } from './components/survey_section';
import { NoRemoteCluster } from '../../../components/empty_states';
import { WaffleInventorySwitcher } from './components/waffle/waffle_inventory_switcher';
import { SnapshotToolbar } from './components/snapshot_toolbar';
import { SnapshotModeProvider } from './hooks/use_snapshot_mode';
import { TryItButton } from '../../../components/try_it_button';
import { useWaffleOptionsContext } from './hooks/use_waffle_options';
import { IntegrationContainer } from './components/integration_container';

const HOSTS_LINK_LOCAL_STORAGE_KEY = 'inventoryUI:hostsLinkClicked';

export const InventoryPage = () => {
  const { nodeType } = useWaffleOptionsContext();

  const { isLoading, loadSourceFailureMessage, loadSource, source } = useSourceContext();
  const { metricIndicesExist, remoteClustersExist } = source?.status ?? {};

  useTrackPageview({ app: 'infra_metrics', path: 'inventory' });
  useTrackPageview({ app: 'infra_metrics', path: 'inventory', delay: 15000 });

  useMetricsBreadcrumbs([
    {
      text: inventoryTitle,
    },
  ]);

  const [hostsLinkClicked, setHostsLinkClicked] = useLocalStorage<boolean>(
    HOSTS_LINK_LOCAL_STORAGE_KEY,
    false
  );
  const hostsLinkClickedRef = useRef<boolean | undefined>(hostsLinkClicked);

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
      <div className={APP_WRAPPER_CLASS}>
        <MetricsPageTemplate
          hasData={metricIndicesExist}
          pageHeader={{
            pageTitle: inventoryTitle,
            rightSideItems: [<SurveySection />],
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
          <SnapshotModeProvider>
            <EuiFlexGroup direction="column">
              <EuiFlexItem grow={false}>
                <FilterBar />
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center">
                  <EuiFlexItem grow={false}>
                    <WaffleInventorySwitcher />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    {ItemTypeRT.is(nodeType) ? (
                      <SnapshotToolbar />
                    ) : (
                      // eslint-disable-next-line @kbn/i18n/strings_should_be_translated_with_i18n
                      <div>&lt;IntegrationsToolbar&gt;</div>
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>

              {!hostsLinkClickedRef.current && nodeType === 'host' && (
                <EuiFlexItem grow={false}>
                  <TryItButton
                    data-test-subj="inventory-hostsView-link"
                    label={i18n.translate('xpack.infra.layout.hostsLandingPageLink', {
                      defaultMessage: 'Introducing a new Hosts analysis experience',
                    })}
                    link={{
                      app: 'metrics',
                      pathname: '/hosts',
                    }}
                    experimental
                    onClick={() => {
                      setHostsLinkClicked(true);
                    }}
                  />
                </EuiFlexItem>
              )}

              <EuiFlexItem>
                {ItemTypeRT.is(nodeType) ? <SnapshotContainer /> : <IntegrationContainer />}
              </EuiFlexItem>
            </EuiFlexGroup>
          </SnapshotModeProvider>
        </MetricsPageTemplate>
      </div>
    </EuiErrorBoundary>
  );
};
