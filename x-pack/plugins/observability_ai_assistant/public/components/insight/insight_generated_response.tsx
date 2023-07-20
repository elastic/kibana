/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Feedback, FeedbackButtons } from '../feedback_buttons';
import { useStreamingText } from './use_streaming_words';
interface InsightGeneratedResponseProps {
  answer: string;
  onClickFeedback: (feedback: Feedback) => void;
  onClickRegenerate: () => void;
  onClickStartChat: () => void;
}

export function InsightGeneratedResponse({
  onClickFeedback,
  onClickRegenerate,
  onClickStartChat,
}: InsightGeneratedResponseProps) {
  const answer = useStreamingText({
    message: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. 

Aliquam commodo sollicitudin erat in ultrices. Vestibulum euismod ex ac lectus semper hendrerit. 

Morbi mattis odio justo, in ullamcorper metus aliquet eu. Praesent risus velit, rutrum ac magna non, vehicula vestibulum sapien. Quisque pulvinar eros eu finibus iaculis. 

Morbi dapibus sapien lacus, vitae suscipit ex egestas pharetra. In velit eros, fermentum sit amet augue ut, aliquam sodales nulla. Nunc mattis lobortis eros sit amet dapibus. 

      Morbi non faucibus massa. Aliquam sed augue in eros ornare luctus sit amet cursus dolor. Pellentesque pellentesque lorem eu odio auctor convallis. Sed sodales felis at velit tempus tincidunt. Nulla sed ante cursus nibh mollis blandit. In mattis imperdiet tellus. Vestibulum nisl turpis, efficitur quis sollicitudin id, mollis in arcu. Vestibulum pulvinar tincidunt magna, vitae facilisis massa congue quis. Cras commodo efficitur tellus, et commodo risus rutrum at.`,
  });
  return (
    <EuiPanel color="subdued" hasShadow={false}>
      <EuiText size="s">
        <p style={{ whiteSpace: 'pre-line' }}>{answer}</p>
      </EuiText>

      <EuiHorizontalRule margin="s" />

      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={false}>
          <FeedbackButtons onClickFeedback={onClickFeedback} />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup responsive={false} gutterSize="s" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="sparkles" size="s" onClick={onClickRegenerate}>
                {i18n.translate('xpack.observabilityAiAssistant.insight.response.regenerate', {
                  defaultMessage: 'Regenerate',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButton fill iconType="discuss" size="s" onClick={onClickStartChat}>
                {i18n.translate('xpack.observabilityAiAssistant.insight.response.startChat', {
                  defaultMessage: 'Start chat',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
