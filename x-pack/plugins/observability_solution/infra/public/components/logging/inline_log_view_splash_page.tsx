/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import { EuiEmptyPrompt } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { PageTemplate } from '../page_template';

type InlineLogViewSplashPageProps = {
  revertToDefaultLogView: () => void;
} & LazyObservabilityPageTemplateProps;

export const InlineLogViewSplashPage: React.FC<InlineLogViewSplashPageProps> = (props) => {
  const { revertToDefaultLogView, ...templateProps } = props;
  return (
    <PageTemplate {...templateProps} isEmptyState={true}>
      <InlineLogViewSplashPrompt revertToDefaultLogView={revertToDefaultLogView} />
    </PageTemplate>
  );
};

export const InlineLogViewSplashPrompt: React.FC<{
  revertToDefaultLogView: InlineLogViewSplashPageProps['revertToDefaultLogView'];
}> = ({ revertToDefaultLogView }) => {
  const title = (
    <FormattedMessage
      id="xpack.infra.ml.splash.inlineLogView.title"
      defaultMessage="Switch to a persisted Log View"
    />
  );

  const ctaButton = (
    <EuiButton
      data-test-subj="infraInlineLogViewSplashPromptRevertToDefaultPersistedLogViewButton"
      fullWidth={false}
      fill
      onClick={revertToDefaultLogView}
    >
      <FormattedMessage
        id="xpack.infra.ml.splash.inlineLogView.buttonText"
        defaultMessage="Revert to default (persisted) Log View"
      />
    </EuiButton>
  );

  const description = (
    <FormattedMessage
      id="xpack.infra.ml.splash.inlineLogView.description"
      defaultMessage="This feature does not support inline Log Views"
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
