/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary } from '@elastic/eui';
import React from 'react';
import { useTrackPageview, FeatureFeedbackButton } from '@kbn/observability-shared-plugin/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { css } from '@emotion/react';
import { OnboardingFlow } from '../../../components/shared/templates/no_data_config';
import { InfraPageTemplate } from '../../../components/shared/templates/infra_page_template';
import { SYSTEM_INTEGRATION } from '../../../../common/constants';
import { useKibanaEnvironmentContext } from '../../../hooks/use_kibana';
import { useMetricsBreadcrumbs } from '../../../hooks/use_metrics_breadcrumbs';
import { hostsTitle } from '../../../translations';
import { fullHeightContentStyles } from '../../../page_template.styles';
import { HostContainer } from './components/hosts_container';

const HOSTS_FEEDBACK_LINK =
  'https://docs.google.com/forms/d/e/1FAIpQLScRHG8TIVb1Oq8ZhD4aks3P1TmgiM58TY123QpDCcBz83YC6w/viewform';

const DATA_AVAILABILITY_MODULES = [SYSTEM_INTEGRATION];

export const HostsPage = () => {
  const { kibanaVersion, isCloudEnv, isServerlessEnv } = useKibanaEnvironmentContext();

  useTrackPageview({ app: 'infra_metrics', path: 'hosts' });
  useTrackPageview({ app: 'infra_metrics', path: 'hosts', delay: 15000 });

  useMetricsBreadcrumbs([
    {
      text: hostsTitle,
    },
  ]);

  return (
    <EuiErrorBoundary>
      <div className={APP_WRAPPER_CLASS}>
        <InfraPageTemplate
          dataAvailabilityModules={DATA_AVAILABILITY_MODULES}
          onboardingFlow={OnboardingFlow.Hosts}
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
        </InfraPageTemplate>
      </div>
    </EuiErrorBoundary>
  );
};
