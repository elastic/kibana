/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiButton,
  EuiButtonEmpty,
  EuiImage,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { LoadingPage } from '../../loading_page';

import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { euiStyled } from '../../../../../observability/public';
import { useTrialStatus } from '../../../hooks/use_trial_status';

export const SubscriptionSplashContent: React.FC = () => {
  const { services } = useKibana();
  const { loadState, isTrialAvailable, checkTrialAvailability } = useTrialStatus();

  useEffect(() => {
    checkTrialAvailability();
  }, [checkTrialAvailability]);

  if (loadState === 'pending') {
    return (
      <LoadingPage
        message={i18n.translate('xpack.infra.logs.logAnalysis.splash.loadingMessage', {
          defaultMessage: 'Checking license...',
        })}
      />
    );
  }

  const canStartTrial = isTrialAvailable && loadState === 'resolved';

  let title;
  let description;
  let cta;

  if (canStartTrial) {
    title = (
      <FormattedMessage
        id="xpack.infra.logs.logAnalysis.splash.startTrialTitle"
        defaultMessage="To access anomaly detection, start a free trial"
      />
    );

    description = (
      <FormattedMessage
        id="xpack.infra.logs.logAnalysis.splash.startTrialDescription"
        defaultMessage="Our free, 14-day trial includes machine learning features, which enable you to detect anomalies in your logs."
      />
    );

    cta = (
      <EuiButton
        fullWidth={false}
        fill
        href={services.http.basePath.prepend('/app/management/stack/license_management')}
      >
        <FormattedMessage
          id="xpack.infra.logs.logAnalysis.splash.startTrialCta"
          defaultMessage="Start trial"
        />
      </EuiButton>
    );
  } else {
    title = (
      <FormattedMessage
        id="xpack.infra.logs.logAnalysis.splash.updateSubscriptionTitle"
        defaultMessage="To access anomaly detection, upgrade to a Platinum Subscription"
      />
    );

    description = (
      <FormattedMessage
        id="xpack.infra.logs.logAnalysis.splash.updateSubscriptionDescription"
        defaultMessage="You must have a Platinum Subscription to use machine learning features."
      />
    );

    cta = (
      <EuiButton fullWidth={false} fill href="https://www.elastic.co/subscriptions">
        <FormattedMessage
          id="xpack.infra.logs.logAnalysis.splash.updateSubscriptionCta"
          defaultMessage="Upgrade subscription"
        />
      </EuiButton>
    );
  }

  return (
    <SubscriptionPage>
      <EuiPageBody>
        <SubscriptionPageContent verticalPosition="center" horizontalPosition="center">
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiTitle size="m">
                <h2>{title}</h2>
              </EuiTitle>
              <EuiSpacer size="xl" />
              <EuiText>
                <p>{description}</p>
              </EuiText>
              <EuiSpacer />
              <div>{cta}</div>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiImage
                alt={i18n.translate('xpack.infra.logs.logAnalysis.splash.splashImageAlt', {
                  defaultMessage: 'Placeholder image',
                })}
                url={services.http.basePath.prepend(
                  '/plugins/infra/assets/anomaly_chart_minified.svg'
                )}
                size="fullWidth"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <SubscriptionPageFooter>
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.infra.logs.logAnalysis.splash.learnMoreTitle"
                  defaultMessage="Want to learn more?"
                />
              </h3>
            </EuiTitle>
            <EuiButtonEmpty
              flush="left"
              iconType="training"
              target="_blank"
              color="text"
              href="https://www.elastic.co/guide/en/kibana/master/xpack-logs-analysis.html"
            >
              <FormattedMessage
                id="xpack.infra.logs.logAnalysis.splash.learnMoreLink"
                defaultMessage="Read documentation"
              />
            </EuiButtonEmpty>
          </SubscriptionPageFooter>
        </SubscriptionPageContent>
      </EuiPageBody>
    </SubscriptionPage>
  );
};

const SubscriptionPage = euiStyled(EuiPage)`
  height: 100%
`;

const SubscriptionPageContent = euiStyled(EuiPageContent)`
  max-width: 768px !important;
`;

const SubscriptionPageFooter = euiStyled.div`
  background: ${(props) => props.theme.eui.euiColorLightestShade};
  margin: 0 -${(props) => props.theme.eui.paddingSizes.l} -${(props) =>
  props.theme.eui.paddingSizes.l};
  padding: ${(props) => props.theme.eui.paddingSizes.l};
`;
