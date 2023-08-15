/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ChatCompletionRequestMessage } from 'openai';
import React, { useCallback, useEffect, useState } from 'react';
import { CoPilotPromptId } from '../../../common';
import type { CoPilotService } from '../../typings/co_pilot';

interface Props {
  coPilot: CoPilotService;
  promptId: CoPilotPromptId;
  messages?: ChatCompletionRequestMessage[];
  response: string;
  responseTime: number;
}

export function CoPilotPromptFeedback({
  coPilot,
  promptId,
  messages,
  response,
  responseTime,
}: Props) {
  const theme = useEuiTheme();

  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);

  const submitFeedback = useCallback(
    (positive: boolean) => {
      setHasSubmittedFeedback(true);
      if (messages) {
        coPilot
          .track({
            messages,
            response,
            responseTime,
            promptId,
            feedbackAction: positive ? 'thumbsup' : 'thumbsdown',
          })
          .catch((err) => {});
      }
    },
    [coPilot, promptId, messages, response, responseTime]
  );

  const [hasSubmittedTelemetry, setHasSubmittedTelemetry] = useState(false);

  useEffect(() => {
    if (!hasSubmittedTelemetry && messages) {
      setHasSubmittedTelemetry(true);
      coPilot
        .track({
          messages,
          response,
          responseTime,
          promptId,
        })
        .catch((err) => {});
    }
  }, [coPilot, promptId, messages, response, responseTime, hasSubmittedTelemetry]);

  if (hasSubmittedFeedback) {
    return (
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type="check" color={theme.euiTheme.colors.primaryText} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" color={theme.euiTheme.colors.primaryText}>
            {i18n.translate('xpack.observability.coPilotPrompt.feedbackSubmittedText', {
              defaultMessage:
                "Thank you for submitting your feedback! We'll use this to improve responses.",
            })}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiText size="s" color={theme.euiTheme.colors.primaryText}>
          {i18n.translate('xpack.observability.coPilotPrompt.feedbackActionTitle', {
            defaultMessage: 'Did you find this response helpful?',
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="xs"
          data-test-subj="CoPilotPromptButtonHappy"
          iconType="faceHappy"
          onClick={() => {
            submitFeedback(true);
          }}
        >
          {i18n.translate('xpack.observability.coPilotPrompt.likedFeedbackButtonTitle', {
            defaultMessage: 'Yes',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="xs"
          data-test-subj="CoPilotPromptButtonSad"
          iconType="faceSad"
          onClick={() => {
            submitFeedback(false);
          }}
        >
          {i18n.translate('xpack.observability.coPilotPrompt.dislikedFeedbackButtonTitle', {
            defaultMessage: 'No',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
