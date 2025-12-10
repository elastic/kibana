/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiButton } from '@elastic/eui';

export interface AiInsightErrorBannerProps {
  error?: string;
  isEmptyResponse?: boolean;
  onRetry?: () => void;
  'data-test-subj'?: string;
}

export function AiInsightErrorBanner({
  error,
  onRetry,
  'data-test-subj': dataTestSubj,
}: AiInsightErrorBannerProps) {
  const title = error
    ? i18n.translate('observabilityAgentBuilder.aiInsight.errorTitle', {
        defaultMessage: 'Failed to generate AI insight',
      })
    : i18n.translate('observabilityAgentBuilder.aiInsight.emptyResponseTitle', {
        defaultMessage: 'Empty response received',
      });

  const message =
    error ||
    i18n.translate('observabilityAgentBuilder.aiInsight.emptyResponseMessage', {
      defaultMessage:
        'The AI insight could not be generated. Please try again or contact your administrator if the problem persists.',
    });

  return (
    <EuiCallOut
      announceOnMount
      color="danger"
      iconType="alert"
      title={title}
      data-test-subj={`${dataTestSubj}ErrorBanner`}
    >
      <p>{message}</p>
      {onRetry && (
        <EuiButton size="s" onClick={onRetry} data-test-subj={`${dataTestSubj}RetryButton`}>
          {i18n.translate('observabilityAgentBuilder.aiInsight.retryButton', {
            defaultMessage: 'Try again',
          })}
        </EuiButton>
      )}
    </EuiCallOut>
  );
}
