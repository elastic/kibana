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
import { i18n } from '@kbn/i18n';
import { FeatureFeedbackButton } from '../../../components/feature_feedback_button';
import { SourceErrorPage } from '../../../components/source_error_page';
import { SourceLoadingPage } from '../../../components/source_loading_page';
import { useSourceContext } from '../../../containers/metrics_source';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { MetricsPageTemplate } from '../page_template';
import { hostsTitle } from '../../../translations';
import { MetricsDataViewProvider } from './hooks/use_data_view';
import { fullHeightContentStyles } from '../../../page_template.styles';
import { HostContainer } from './components/hosts_container';
import { BetaBadge } from '../../../components/beta_badge';
import { NoRemoteCluster } from '../../../components/empty_states';

const HOSTS_FEEDBACK_LINK =
  'https://docs.google.com/forms/d/e/1FAIpQLScRHG8TIVb1Oq8ZhD4aks3P1TmgiM58TY123QpDCcBz83YC6w/viewform';

export const HostsPage = () => {
  const { isLoading, loadSourceFailureMessage, loadSource, source } = useSourceContext();

  useTrackPageview({ app: 'infra_metrics', path: 'hosts' });
  useTrackPageview({ app: 'infra_metrics', path: 'hosts', delay: 15000 });

  useMetricsBreadcrumbs([
    {
      text: hostsTitle,
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
                <BetaBadge
                  tooltipContent={i18n.translate('xpack.infra.hostsViewPage.betaBadgeDescription', {
                    defaultMessage:
                      'This feature is currently in beta. If you encounter any bugs or have feedback, we’d love to hear from you. Please open a support issue and/or share your feedback via the "Tell us what you think!" feedback button.',
                  })}
                />
              </div>
            ),
            rightSideItems: [
              <FeatureFeedbackButton
                data-test-subj="infraHostsPageTellUsWhatYouThinkButton"
                formUrl={HOSTS_FEEDBACK_LINK}
              />,
            ],
          }}
          pageSectionProps={{
            contentProps: {
              css: fullHeightContentStyles,
            },
          }}
        >
          {source && (
            <MetricsDataViewProvider metricAlias={source.configuration.metricAlias}>
              <HostContainer />
            </MetricsDataViewProvider>
          )}
        </MetricsPageTemplate>
      </div>
    </EuiErrorBoundary>
  );
};
