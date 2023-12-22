/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React from 'react';
import { useCheckStepCompleted } from '../hooks/use_check_step_completed';
import { useStepContentStyles } from '../styles/step_content.styles';
import type {
  CardId,
  CheckIfStepCompleted,
  SectionId,
  Step,
  ToggleTaskCompleteStatus,
} from '../types';

const StepContentComponent = ({
  autoCheckIfStepCompleted,
  cardId,
  indicesExist,
  sectionId,
  step,
  toggleTaskCompleteStatus,
}: {
  autoCheckIfStepCompleted?: CheckIfStepCompleted;
  cardId: CardId;
  indicesExist: boolean;
  sectionId: SectionId;
  step: Step;
  toggleTaskCompleteStatus: ToggleTaskCompleteStatus;
}) => {
  const { id: stepId, splitPanel } = step;
  const {
    stepContentGroupStyles,
    leftContentStyles,
    descriptionStyles,
    rightPanelStyles,
    rightPanelContentStyles,
  } = useStepContentStyles();

  useCheckStepCompleted({
    autoCheckIfStepCompleted,
    cardId,
    indicesExist,
    sectionId,
    stepId,
    stepTitle: step.title,
    toggleTaskCompleteStatus,
  });

  return (
    <EuiFlexGroup
      color="plain"
      className="step-content-group"
      css={stepContentGroupStyles}
      data-test-subj={`${stepId}-content`}
      direction="row"
      gutterSize="none"
    >
      {step.description && (
        <EuiFlexItem grow={false} css={leftContentStyles} className="left-panel">
          <EuiText size="s">
            {step.description.map((desc, index) => (
              <div
                data-test-subj={`${stepId}-description-${index}`}
                key={`${stepId}-description-${index}`}
                className="eui-displayBlock step-content-description"
                css={descriptionStyles}
              >
                {desc}
              </div>
            ))}
          </EuiText>
        </EuiFlexItem>
      )}
      {splitPanel && (
        <EuiFlexItem
          grow={false}
          data-test-subj="split-panel"
          className="right-panel"
          css={rightPanelStyles}
        >
          {splitPanel && (
            <div className="right-panel-wrapper" css={rightPanelContentStyles}>
              {splitPanel}
            </div>
          )}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
export const StepContent = React.memo(StepContentComponent);
