/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { LazyObservabilityPageTemplateProps, useLinkProps } from '@kbn/observability-plugin/public';
import { EuiEmptyPrompt } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { PageTemplate } from '../page_template';

export const InlineLogViewSplashPage: React.FC<LazyObservabilityPageTemplateProps> = (
  templateProps
) => {
  return (
    <PageTemplate {...templateProps} isEmptyState={true}>
      <InlineLogViewSplashPrompt />
    </PageTemplate>
  );
};

export const InlineLogViewSplashPrompt: React.FC = () => {
  const linkProps = useLinkProps({
    app: 'logs',
    pathname: '/settings',
  });

  const title = (
    <FormattedMessage
      id="xpack.infra.ml.splash.inlineLogView.title"
      defaultMessage="Switch to a persisted Log View"
    />
  );

  const ctaButton = (
    <EuiButton fullWidth={false} fill {...linkProps}>
      <FormattedMessage
        id="xpack.infra.ml.splash.inlineLogView.buttonText"
        defaultMessage="Settings"
      />
    </EuiButton>
  );

  const description = (
    <FormattedMessage
      id="xpack.infra.ml.splash.inlineLogView.description"
      defaultMessage="This feature does not support inline Log Views, you can switch to a persisted Log View via the settings page"
    />
  );

  return (
    <EuiEmptyPrompt
      iconType={'visLine'}
      title={<h2>{title}</h2>}
      body={
        <EuiText>
          <p>{description}</p>
        </EuiText>
      }
      actions={ctaButton}
    />
  );
};
