/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText, EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { HttpStart } from '@kbn/core/public';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-plugin/public';
import { useTrialStatus } from '../hooks/use_trial_status';
import { LoadingPrompt } from './loading_page';
import { PageTemplate } from './page_template';

const loadingMessage = i18n.translate('xpack.infra.ml.splash.loadingMessage', {
  defaultMessage: 'Checking license...',
});

export const SubscriptionSplashPage: React.FC<LazyObservabilityPageTemplateProps> = (
  templateProps
) => {
  return (
    <PageTemplate {...templateProps} isEmptyState={true}>
      <SubscriptionSplashPrompt />
    </PageTemplate>
  );
};

export const SubscriptionSplashPrompt: React.FC = () => {
  const { services } = useKibana<{ http: HttpStart }>();
  const { loadState, isTrialAvailable, checkTrialAvailability } = useTrialStatus();

  useEffect(() => {
    checkTrialAvailability();
  }, [checkTrialAvailability]);

  if (loadState === 'pending') {
    return <LoadingPrompt message={loadingMessage} />;
  }

  const canStartTrial = isTrialAvailable && loadState === 'resolved';

  let title;
  let description;
  let cta;

  if (canStartTrial) {
    title = (
      <FormattedMessage
        id="xpack.infra.ml.splash.startTrialTitle"
        defaultMessage="To access anomaly detection, start a free trial"
      />
    );

    description = (
      <FormattedMessage
        id="xpack.infra.ml.splash.startTrialDescription"
        defaultMessage="Our free trial includes machine learning features, which enable you to detect anomalies in your logs."
      />
    );

    cta = (
      <EuiButton
        fullWidth={false}
        fill
        href={services.http.basePath.prepend('/app/management/stack/license_management')}
      >
        <FormattedMessage id="xpack.infra.ml.splash.startTrialCta" defaultMessage="Start trial" />
      </EuiButton>
    );
  } else {
    title = (
      <FormattedMessage
        id="xpack.infra.ml.splash.updateSubscriptionTitle"
        defaultMessage="To access anomaly detection, upgrade to a Platinum Subscription"
      />
    );

    description = (
      <FormattedMessage
        id="xpack.infra.ml.splash.updateSubscriptionDescription"
        defaultMessage="You must have a Platinum Subscription to use machine learning features."
      />
    );

    cta = (
      <EuiButton fullWidth={false} fill href="https://www.elastic.co/subscriptions">
        <FormattedMessage
          id="xpack.infra.ml.splash.updateSubscriptionCta"
          defaultMessage="Upgrade subscription"
        />
      </EuiButton>
    );
  }

  return (
    <EuiEmptyPrompt
      iconType={'visLine'}
      title={<h2>{title}</h2>}
      body={
        <EuiText>
          <p>{description}</p>
        </EuiText>
      }
      actions={cta}
    />
  );
};
