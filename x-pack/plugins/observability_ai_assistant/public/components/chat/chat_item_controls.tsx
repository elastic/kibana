/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { Feedback, FeedbackButtons } from '../feedback_buttons';
import { RegenerateResponseButton } from '../buttons/regenerate_response_button';
import { StopGeneratingButton } from '../buttons/stop_generating_button';

export function ChatItemControls({
  error,
  loading,
  canRegenerate,
  canGiveFeedback,
  onFeedbackClick,
  onRegenerateClick,
  onStopGeneratingClick,
}: {
  error: any;
  loading: boolean;
  canRegenerate: boolean;
  canGiveFeedback: boolean;
  onFeedbackClick: (feedback: Feedback) => void;
  onRegenerateClick: () => void;
  onStopGeneratingClick: () => void;
}) {
  const { euiTheme } = useEuiTheme();

  const displayFeedback = !error && canGiveFeedback;
  const displayRegenerate = !loading && canRegenerate;

  let controls;

  if (loading) {
    controls = <StopGeneratingButton onClick={onStopGeneratingClick} />;
  } else if (displayFeedback || displayRegenerate) {
    controls = (
      <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
        {displayFeedback ? (
          <EuiFlexItem grow={true}>
            <FeedbackButtons onClickFeedback={onFeedbackClick} />
          </EuiFlexItem>
        ) : null}
        {displayRegenerate ? (
          <EuiFlexItem grow={false}>
            <RegenerateResponseButton onClick={onRegenerateClick} />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  } else {
    controls = null;
  }

  return controls ? (
    <>
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" color={euiTheme.colors.lightestShade} />
      <EuiPanel hasShadow={false} paddingSize="s">
        {controls}
      </EuiPanel>
    </>
  ) : null;
}
