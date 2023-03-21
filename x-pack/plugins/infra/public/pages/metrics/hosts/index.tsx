/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import { useLinkProps, useTrackPageview } from '@kbn/observability-plugin/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { SourceErrorPage } from '../../../components/source_error_page';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { useSourceContext } from '../../../containers/metrics_source';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { MetricsPageTemplate } from '../page_template';
import { hostsTitle } from '../../../translations';
import { MetricsDataViewProvider } from './hooks/use_data_view';
import { fullHeightContentStyles } from '../../../page_template.styles';
import { UnifiedSearchProvider } from './hooks/use_unified_search';
import { HostContainer } from './components/hosts_container';
import { ExperimentalBadge } from '../../../components/experimental_badge';
import { NoIndices } from '../../../components/empty_states';

const HOSTS_FEEDBACK_LINK = 'https://ela.st/host-feedback';

export const HostsPage = () => {
  const {
    hasFailedLoadingSource,
    isLoading,
    loadSourceFailureMessage,
    loadSource,
    source
  } = useSourceContext();
  useTrackPageview({ app: 'infra_metrics', path: 'hosts' });
  useTrackPageview({ app: 'infra_metrics', path: 'hosts', delay: 15000 });

  useMetricsBreadcrumbs([
    {
      text: hostsTitle,
    },
  ]);

  const settingLinkProps = useLinkProps({ app: 'metrics', pathname: '/settings' });

  const { metricIndicesExist, remoteClustersExist } = source?.status ?? {}

  if (isLoading && !source) return <SourceLoadingPage />

  const settingsCtaButton = <EuiButton
    data-test-subj="infraHostsPageGoToSettings"
    {...settingLinkProps}
  >
    <FormattedMessage
      id="xpack.infra.hostsPage.goToMetricsSettings"
      defaultMessage="Go to Metrics Settings"
    />
  </EuiButton>


  const hasNoData = false // TODO: make this come from source api
  if (hasNoData) return <MetricsPageTemplate hasData={metricIndicesExist} data-test-subj="noMetricsIndicesPrompt" />
  
  if (!remoteClustersExist) {
    return <NoIndices title="Missing remote cluster" message="Oh no, the remote cluster is not configured" actions={[settingsCtaButton]} />
  }

  if (!metricIndicesExist) {
    return <NoIndices title="No index found for this config" message="Looks like this index does not exists" actions={[settingsCtaButton]} />
  }

  if (loadSourceFailureMessage) return <SourceErrorPage errorMessage={loadSourceFailureMessage || ''} retry={loadSource} />

  return source && (
    <EuiErrorBoundary>
      <div className={APP_WRAPPER_CLASS}>
        <MetricsPageTemplate
          hasData={metricIndicesExist}
          pageHeader={{
            alignItems: 'center',
            pageTitle: (
              <div
                css={css`
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                  `}
              >
                <h1>{hostsTitle}</h1>
                <ExperimentalBadge />
              </div>
            ),
            rightSideItems: [
              <EuiButton
                data-test-subj="infraHostsPageTellUsWhatYouThinkButton"
                href={HOSTS_FEEDBACK_LINK}
                target="_blank"
                color="warning"
                iconType="editorComment"
              >
                <FormattedMessage
                  id="xpack.infra.hostsPage.tellUsWhatYouThinkLink"
                  defaultMessage="Tell us what you think!"
                />
              </EuiButton>,
            ],
          }}
          pageSectionProps={{
            contentProps: {
              css: fullHeightContentStyles,
            },
          }}
        >
          <MetricsDataViewProvider metricAlias={source.configuration.metricAlias}>
            <UnifiedSearchProvider>
              <HostContainer />
            </UnifiedSearchProvider>
          </MetricsDataViewProvider>
        </MetricsPageTemplate>
      </div>
    </EuiErrorBoundary>
  );
};
