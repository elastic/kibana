/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

export type Feedback = 'positive' | 'negative';

interface FeedbackButtonsProps {
  onClickFeedback: (feedback: Feedback) => void;
}

export function FeedbackButtons({ onClickFeedback }: FeedbackButtonsProps) {
  return (
    <EuiFlexGroup responsive={false} direction="row" alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="s">
          <em>
            {i18n.translate('xpack.observabilityAiAssistant.insight.feedbackButtons.title', {
              defaultMessage: 'Was this helpful?',
            })}
          </em>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false} direction="row" alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="success"
              iconType="faceHappy"
              size="s"
              onClick={() => onClickFeedback('positive')}
            >
              {i18n.translate('xpack.observabilityAiAssistant.insight.feedbackButtons.positive', {
                defaultMessage: 'Yes',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="danger"
              iconType="faceSad"
              size="s"
              onClick={() => onClickFeedback('negative')}
            >
              {i18n.translate('xpack.observabilityAiAssistant.insight.feedbackButtons.negative', {
                defaultMessage: 'No',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
