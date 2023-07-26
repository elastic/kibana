/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { MessageRole } from '../../../common';
import { Feedback, FeedbackButtons } from '../feedback_buttons';
import { RegenerateResponseButton } from '../regenerate_response_button';

interface ChatItemControls {
  role: MessageRole;
  onFeedbackClick: (feedback: Feedback) => void;
  onRegenerateClick: () => void;
  canReceiveFeedback: boolean;
  canRegenerateResponse: boolean;
}

export function ChatItemControls({
  role,
  onFeedbackClick,
  onRegenerateClick,
  canReceiveFeedback,
  canRegenerateResponse,
}: ChatItemControls) {
  return canReceiveFeedback || canRegenerateResponse ? (
    <>
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
