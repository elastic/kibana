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
  StepId,
  ToggleTaskCompleteStatus,
} from '../types';

const StepContentComponent = ({
  autoCheckIfStepCompleted,
  cardId,
  description,
  indicesExist,
  sectionId,
  splitPanel,
  stepId,
  toggleTaskCompleteStatus,
}: {
  autoCheckIfStepCompleted?: CheckIfStepCompleted;
  cardId: CardId;
  description?: React.ReactNode[];
  indicesExist: boolean;
  sectionId: SectionId;
  splitPanel?: React.ReactNode;
  stepId: StepId;
  toggleTaskCompleteStatus: ToggleTaskCompleteStatus;
}) => {
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
      {description && (
        <EuiFlexItem grow={false} css={leftContentStyles} className="left-panel">
          <EuiText size="s">
            {description?.map((desc, index) => (
              <p
                data-test-subj={`${stepId}-description-${index}`}
                key={`${stepId}-description-${index}`}
                className="eui-displayBlock step-content-description"
                css={descriptionStyles}
              >
                {desc}
              </p>
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
            <div className="right-content-panel" css={rightPanelContentStyles}>
              {splitPanel}
            </div>
          )}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
export const StepContent = React.memo(StepContentComponent);
