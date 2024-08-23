/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiHorizontalRule,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { OBSERVABILITY_ONBOARDING_FEEDBACK_TELEMETRY_EVENT } from '../../../../common/telemetry_events';

export type Feedback = 'positive' | 'negative';

const THANK_YOU_MESSAGE = i18n.translate(
  'xpack.observability_onboarding.feedbackButtons.em.thanksForYourFeedbackLabel',
  { defaultMessage: 'Thanks for your feedback!' }
);

export function FeedbackButtons({ flow }: { flow: string }) {
  const { notifications, analytics } = useKibana().services;

  const handleClick = (feedback: Feedback) => {
    analytics?.reportEvent(OBSERVABILITY_ONBOARDING_FEEDBACK_TELEMETRY_EVENT.eventType, {
      flow,
      feedback,
    });
    notifications?.toasts.addSuccess(THANK_YOU_MESSAGE);
  };

  return (
    <>
      <EuiHorizontalRule />
      <EuiFlexGroup responsive={false} direction="row" alignItems="center" gutterSize="s" wrap>
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size="s">
            <em>
              {i18n.translate('xpack.observability_onboarding.insight.feedbackButtons.title', {
                defaultMessage: 'Was this helpful?',
              })}
            </em>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup responsive={false} direction="row" alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="observabilityAiAssistantFeedbackButtonsPositiveButton"
                color="success"
                iconType="faceHappy"
                size="s"
                onClick={() => handleClick('positive')}
              >
                {i18n.translate('xpack.observability_onboarding.insight.feedbackButtons.positive', {
                  defaultMessage: 'Yes',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="observabilityAiAssistantFeedbackButtonsNegativeButton"
                color="danger"
                iconType="faceSad"
                size="s"
                onClick={() => handleClick('negative')}
              >
                {i18n.translate('xpack.observability_onboarding.insight.feedbackButtons.negative', {
                  defaultMessage: 'No',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
