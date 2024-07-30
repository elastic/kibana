/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React, { useMemo } from 'react';
import { useTrackPageview, FeatureFeedbackButton } from '@kbn/observability-shared-plugin/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { SYSTEM_INTEGRATION } from '../../../../common/constants';
import { useKibanaEnvironmentContext } from '../../../hooks/use_kibana';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { MetricsPageTemplate } from '../templates/page_template';
import { getNoDataConfigDetails } from '../templates/no_data_config';
import { hostsTitle } from '../../../translations';
import { fullHeightContentStyles } from '../../../page_template.styles';
import { HostContainer } from './components/hosts_container';
import { BetaBadge } from '../../../components/beta_badge';

const HOSTS_FEEDBACK_LINK =
  'https://docs.google.com/forms/d/e/1FAIpQLScRHG8TIVb1Oq8ZhD4aks3P1TmgiM58TY123QpDCcBz83YC6w/viewform';

export const HostsPage = () => {
  const { kibanaVersion, isCloudEnv, isServerlessEnv } = useKibanaEnvironmentContext();

  useTrackPageview({ app: 'infra_metrics', path: 'hosts' });
  useTrackPageview({ app: 'infra_metrics', path: 'hosts', delay: 15000 });

  useMetricsBreadcrumbs([
    {
      text: hostsTitle,
    },
  ]);

  const noDataConfig = useMemo(
    () =>
      getNoDataConfigDetails({
        card: {
          title: i18n.translate('xpack.infra.hostsViewPage.noData.card.cta', {
            defaultMessage: 'Add data',
          }),
          description: i18n.translate('xpack.infra.hostsViewPage.noData.card.description', {
            defaultMessage:
              'Start collecting data for your hosts to understand metric trends, explore logs and deep insight into their performance',
          }),
        },
        page: {
          pageTitle: i18n.translate('xpack.infra.hostsViewPage.noData.page.title', {
            defaultMessage: 'Detect and resolve problems with your hosts',
          }),
          pageDescription: i18n.translate('xpack.infra.hostsViewPage.noData.page.description', {
            defaultMessage:
              'Understand how your hosts are performing so you can take action before it becomes a problem.',
          }),
        },
      }),
    []
  );

  return (
    <EuiErrorBoundary>
      <div className={APP_WRAPPER_CLASS}>
        <MetricsPageTemplate
          dataAvailabilityModules={[SYSTEM_INTEGRATION]}
          noDataConfig={noDataConfig}
          onboardingFlow="logs"
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
                kibanaVersion={kibanaVersion}
                isCloudEnv={isCloudEnv}
                isServerlessEnv={isServerlessEnv}
              />,
            ],
          }}
          pageSectionProps={{
            contentProps: {
              css: fullHeightContentStyles,
            },
          }}
        >
          <HostContainer />
        </MetricsPageTemplate>
      </div>
    </EuiErrorBoundary>
  );
};
