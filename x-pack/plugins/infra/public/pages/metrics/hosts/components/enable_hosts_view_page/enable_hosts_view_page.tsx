/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { EuiPageTemplate, EuiImage, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import { useEuiBackgroundColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useTrackPageview } from '@kbn/observability-shared-plugin/public';
import { useIsDarkMode } from '../../../../../hooks/use_is_dark_mode';
import { MetricsPageTemplate } from '../../../page_template';
import hostsLandingBetaLight from './hosts_landing_beta_light.svg';
import hostsLandingBetaDark from './hosts_landing_beta_dark.svg';
import { BetaBadge } from '../../../../../components/beta_badge';

interface Props {
  actions?: ReactNode;
}

export const EnableHostsViewPage = ({ actions }: Props) => {
  const backgroundColor = useEuiBackgroundColor('subdued');
  const isDarkMode = useIsDarkMode();

  useTrackPageview({ app: 'infra_metrics', path: 'hosts_feature_enable_landing_page' });
  useTrackPageview({
    app: 'infra_metrics',
    path: 'hosts_feature_enable_landing_page',
    delay: 15000,
  });

  return (
    <MetricsPageTemplate isEmptyState>
      <EuiPageTemplate.EmptyPrompt
        data-test-subj="hostsLandingPage"
        title={
          <h2>
            {i18n.translate('xpack.infra.hostsViewPage.landing.introTitle', {
              defaultMessage: 'Host Analysis',
            })}
          </h2>
        }
        alignment="center"
        icon={
          <EuiImage
            size="fullWidth"
            src={isDarkMode ? hostsLandingBetaDark : hostsLandingBetaLight}
            alt="Hosts Landing Page Image"
          />
        }
        color="plain"
        layout="horizontal"
        body={
          <>
            <BetaBadge />
            <EuiSpacer />
            <p>
              {i18n.translate('xpack.infra.hostsViewPage.landing.introMessage', {
                defaultMessage: `Welcome to the 'Hosts' feature, now available in beta! With this powerful tool, 
                you can easily view and analyse your hosts and identify any issues so you address them quickly. 
                Get a detailed view of metrics for your hosts, see which ones are triggering the most alerts and filter 
                the hosts you want to analyse using any KQL filter and easy breakdowns such as cloud provider and 
                operating system.`,
              })}
            </p>
            <p>
              {i18n.translate('xpack.infra.hostsViewPage.landing.tryTheFeatureMessage', {
                defaultMessage: `This is a beta version of the feature and we would love your 
                feedback as we continue to develop and improve it. To access the feature, 
                simply enable below (or reach out to your internal administrator if not available). 
                Don't miss out on this powerful feature - try it out today!`,
              })}
            </p>
          </>
        }
        css={css`
          background-color: ${backgroundColor};
        `}
        actions={actions}
      />
    </MetricsPageTemplate>
  );
};
