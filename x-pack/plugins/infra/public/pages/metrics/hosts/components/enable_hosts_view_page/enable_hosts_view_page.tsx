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
import { useTrackPageview } from '@kbn/observability-plugin/public';
import { MetricsPageTemplate } from '../../../page_template';
import hostsLandingBeta from './hosts_landing_beta.svg';
import { ExperimentalBadge } from '../../../../../components/experimental_badge';

interface Props {
  actions?: ReactNode;
}

export const EnableHostsViewPage = ({ actions }: Props) => {
  const backgroundColor = useEuiBackgroundColor('subdued');

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
              defaultMessage: 'Introducing: Host Analysis',
            })}
          </h2>
        }
        alignment="center"
        icon={<EuiImage size="fullWidth" src={hostsLandingBeta} alt="" />}
        color="plain"
        layout="horizontal"
        body={
          <>
            <ExperimentalBadge />
            <EuiSpacer />
            <p>
              {i18n.translate('xpack.infra.hostsViewPage.landing.introMessage', {
                defaultMessage: `Introducing our new 'Hosts' feature, now available in technical preview!
                With this powerful tool, you can easily view and analyse your hosts and identify any
                issues so you address them quickly. Get a detailed view of metrics for your hosts, see
                which ones are triggering the most alerts and filter the hosts you want to analyse
                using any KQL filter and easy breakdowns such as cloud provider and operating system.`,
              })}
            </p>
            <p>
              {i18n.translate('xpack.infra.hostsViewPage.landing.tryTheFeatureMessage', {
                defaultMessage: `This is an early version of the feature and we would love your feedback as we continue
                to develop and improve it. To access the feature, simply enable below. Don't miss
                out on this powerful new addition to our platform - try it out today!`,
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
