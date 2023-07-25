/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { Feedback, FeedbackButtons } from '../feedback_buttons';
import { MessageRole } from '../../../common';
import { RegenerateResponseButton } from '../regenerate_response_button';

interface ChatItemControls {
  role: MessageRole;
  onFeedbackClick: (feedback: Feedback) => void;
  onRegenerateClick: () => void;
}

export function ChatItemControls({ role, onFeedbackClick, onRegenerateClick }: ChatItemControls) {
  const canReceiveFeedback =
    role === MessageRole.Assistant || role === MessageRole.Elastic || role === MessageRole.Function;

  const canRegenerateResponse = role === MessageRole.Assistant;

  return canReceiveFeedback || canRegenerateResponse ? (
    <>
      <EuiSpacer size="m" />
      <EuiHorizontalRule margin="none" />
      <EuiSpacer size="s" />

      <EuiFlexGroup>
        <EuiFlexItem>
          {canReceiveFeedback ? <FeedbackButtons onClickFeedback={onFeedbackClick} /> : null}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {canRegenerateResponse ? <RegenerateResponseButton onClick={onRegenerateClick} /> : null}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  ) : null;
}
