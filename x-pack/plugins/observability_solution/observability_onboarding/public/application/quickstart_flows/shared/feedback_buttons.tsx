/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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
  { defaultMessage: 'Thanks for your feedback' }
);

export function FeedbackButtons({ flow }: { flow: string }) {
  const { notifications, analytics } = useKibana().services;

  const [hasBeenClicked, setHasBeenClicked] = useState(false);

  const handleClickPositive = () => {
    analytics?.reportEvent(OBSERVABILITY_ONBOARDING_FEEDBACK_TELEMETRY_EVENT.eventType, {
      flow,
      feedback: 'positive',
    });
    setHasBeenClicked(true);
    notifications?.toasts.addSuccess(THANK_YOU_MESSAGE);
  };

  const handleClickNegative = () => {
    analytics?.reportEvent(OBSERVABILITY_ONBOARDING_FEEDBACK_TELEMETRY_EVENT.eventType, {
      flow,
      feedback: 'negative',
    });
    setHasBeenClicked(true);
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
                disabled={hasBeenClicked}
                iconType="faceHappy"
                size="s"
                onClick={handleClickPositive}
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
                disabled={hasBeenClicked}
                iconType="faceSad"
                size="s"
                onClick={handleClickNegative}
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
