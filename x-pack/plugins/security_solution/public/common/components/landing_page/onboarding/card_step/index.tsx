/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiBadge,
  EuiButtonIcon,
} from '@elastic/eui';
import React, { useCallback } from 'react';

import classnames from 'classnames';
import { useNavigateTo, SecurityPageName } from '@kbn/security-solution-navigation';

import type {
  CardId,
  OnStepClicked,
  ToggleTaskCompleteStatus,
  SectionId,
  StepId,
  Step,
} from '../types';
import { ALL_DONE_TEXT, EXPAND_STEP_BUTTON_LABEL } from '../translations';

import { StepContent } from './step_content';
import { useCheckStepCompleted } from '../hooks/use_check_step_completed';
import { useStepContext } from '../context/step_context';
import { useCardStepStyles } from '../styles/card_step.styles';

const CardStepComponent: React.FC<{
  cardId: CardId;
  expandedSteps: Set<StepId>;
  finishedSteps: Set<StepId>;
  toggleTaskCompleteStatus: ToggleTaskCompleteStatus;
  onStepClicked: OnStepClicked;
  sectionId: SectionId;
  step: Step;
}> = ({
  cardId,
  expandedSteps,
  finishedSteps = new Set(),
  toggleTaskCompleteStatus,
  onStepClicked,
  sectionId,
  step,
}) => {
  const { navigateTo } = useNavigateTo();

  const isExpandedStep = expandedSteps.has(step.id);

  const { id: stepId, title, description, splitPanel, icon, autoCheckIfStepCompleted } = step;
  const hasStepContent = description != null || splitPanel != null;
  const { indicesExist } = useStepContext();

  useCheckStepCompleted({
    autoCheckIfStepCompleted,
    cardId,
    indicesExist,
    sectionId,
    stepId,
    stepTitle: title,
    toggleTaskCompleteStatus,
  });

  const isDone = finishedSteps.has(stepId);

  const toggleStep = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      const newStatus = !isExpandedStep;

      if (hasStepContent) {
        // Toggle step and sync the expanded card step to storage & reducer
        onStepClicked({ stepId, cardId, sectionId, isExpanded: newStatus, trigger: 'click' });

        navigateTo({
          deepLinkId: SecurityPageName.landing,
          path: newStatus ? `#${stepId}` : undefined,
        });
      }
    },
    [isExpandedStep, hasStepContent, onStepClicked, stepId, cardId, sectionId, navigateTo]
  );

  const {
    stepPanelStyles,
    stepIconStyles,
    stepTitleStyles,
    allDoneTextStyles,
    toggleButtonStyles,
    getStepGroundStyles,
    stepItemStyles,
  } = useCardStepStyles();
  const stepGroundStyles = getStepGroundStyles({ hasStepContent });

  const panelClassNames = classnames(
    {
      'step-panel-collapsed': !isExpandedStep,
    },
    stepPanelStyles
  );

  const stepIconClassNames = classnames('step-icon', {
    'step-icon-done': isDone,
    stepIconStyles,
  });

  const stepTitleClassNames = classnames('step-title', stepTitleStyles);
  const allDoneTextNames = classnames('all-done-badge', allDoneTextStyles);

  return (
    <EuiPanel
      color="plain"
      grow={false}
      hasShadow={false}
      borderRadius="none"
      paddingSize="none"
      className={panelClassNames}
      id={stepId}
    >
      <EuiFlexGroup gutterSize="none" className={stepGroundStyles}>
        <EuiFlexItem grow={false} onClick={toggleStep} className={stepItemStyles}>
          <span className={stepIconClassNames}>
            {icon && <EuiIcon {...icon} size="l" className="eui-alignMiddle" />}
          </span>
        </EuiFlexItem>
        <EuiFlexItem grow={1} onClick={toggleStep} className={stepItemStyles}>
          <span className={stepTitleClassNames}>{title}</span>
        </EuiFlexItem>
        <EuiFlexItem grow={false} className={stepItemStyles}>
          <div>
            {isDone && (
              <EuiBadge className={allDoneTextNames} color="success">
                {ALL_DONE_TEXT}
              </EuiBadge>
            )}
            <EuiButtonIcon
              className="eui-displayInlineBlock toggle-button"
              color="primary"
              onClick={toggleStep}
              iconType={isExpandedStep ? 'arrowUp' : 'arrowDown'}
              aria-label={EXPAND_STEP_BUTTON_LABEL(title ?? '')}
              aria-expanded={isExpandedStep}
              size="xs"
              css={toggleButtonStyles}
              isDisabled={!hasStepContent}
            />
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
      {hasStepContent && (
        <div className="stepContentWrapper">
          <div className="stepContent">
            <StepContent
              autoCheckIfStepCompleted={isExpandedStep ? autoCheckIfStepCompleted : undefined}
              cardId={cardId}
              indicesExist={indicesExist}
              sectionId={sectionId}
              step={step}
              toggleTaskCompleteStatus={toggleTaskCompleteStatus}
            />
          </div>
        </div>
      )}
    </EuiPanel>
  );
};

export const CardStep = React.memo(CardStepComponent);
