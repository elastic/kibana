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
  useEuiTheme,
  EuiButtonIcon,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo } from 'react';

import classnames from 'classnames';
import { useNavigateTo, SecurityPageName } from '@kbn/security-solution-navigation';

import type { CardId, OnStepClicked, ToggleTaskCompleteStatus, SectionId, StepId } from '../types';
import {
  ALL_DONE_TEXT,
  COLLAPSE_STEP_BUTTON_LABEL,
  EXPAND_STEP_BUTTON_LABEL,
} from '../translations';
import { getStepsByActiveProduct } from '../helpers';
import type { ProductLine } from '../../../common/product';

import { StepContent } from './step_content';
import { useCheckStepCompleted } from '../hooks/use_check_step_completed';
import { useStepContext } from '../context/step_context';
import { useCardStepStyles } from '../styles/card_step.styles';

const CardStepComponent: React.FC<{
  activeProducts: Set<ProductLine>;
  cardId: CardId;
  expandedSteps: Set<StepId>;
  finishedSteps: Set<StepId>;
  isExpandedCard: boolean;
  toggleTaskCompleteStatus: ToggleTaskCompleteStatus;
  onStepClicked: OnStepClicked;
  sectionId: SectionId;
  stepId: StepId;
}> = ({
  activeProducts,
  cardId,
  expandedSteps,
  finishedSteps = new Set(),
  isExpandedCard,
  toggleTaskCompleteStatus,
  onStepClicked,
  sectionId,
  stepId,
}) => {
  const { euiTheme } = useEuiTheme();
  const { navigateTo } = useNavigateTo();

  const isExpandedStep = expandedSteps.has(stepId);
  const steps = useMemo(
    () => getStepsByActiveProduct({ activeProducts, cardId, sectionId }),
    [activeProducts, cardId, sectionId]
  );
  const { title, description, splitPanel, icon, autoCheckIfStepCompleted } =
    steps?.find((step) => step.id === stepId) ?? {};
  const hasStepContent = description != null || splitPanel != null;
  const { indicesExist } = useStepContext();

  useCheckStepCompleted({
    autoCheckIfStepCompleted,
    cardId,
    indicesExist,
    sectionId,
    stepId,
    toggleTaskCompleteStatus,
  });

  const isDone = finishedSteps.has(stepId);

  const toggleStep = useCallback(
    (e) => {
      e.preventDefault();

      if (hasStepContent) {
        // Toggle step and sync the expanded card step to storage & reducer
        onStepClicked({ stepId, cardId, sectionId, isExpanded: !isExpandedStep });

        navigateTo({
          deepLinkId: SecurityPageName.landing,
          path: `#${stepId}`,
        });
      }
    },
    [hasStepContent, onStepClicked, stepId, cardId, sectionId, isExpandedStep, navigateTo]
  );

  const {
    stepPanelStyles,
    stepIconStyles,
    stepTitleStyles,
    allDoneTextStyles,
    toggleButtonStyles,
  } = useCardStepStyles();

  const panelClassNames = classnames({
    'step-panel-collapsed': !isExpandedStep,
  });

  return (
    <EuiPanel
      color="plain"
      grow={false}
      hasShadow={false}
      borderRadius="none"
      paddingSize="none"
      className={panelClassNames}
      id={stepId}
      css={stepPanelStyles}
    >
      <EuiFlexGroup
        gutterSize="none"
        css={css`
          cursor: ${hasStepContent ? 'pointer' : 'default'};
          gap: ${euiTheme.size.base};
        `}
      >
        <EuiFlexItem
          grow={false}
          onClick={toggleStep}
          css={css`
            align-self: center;
          `}
        >
          <span className="step-icon" css={stepIconStyles}>
            {icon && <EuiIcon {...icon} size="l" className="eui-alignMiddle" />}
          </span>
        </EuiFlexItem>
        <EuiFlexItem
          grow={1}
          onClick={toggleStep}
          css={css`
            align-self: center;
          `}
        >
          <span className="step-title" css={stepTitleStyles}>
            {title}
          </span>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={css`
            align-self: center;
          `}
        >
          <div>
            {isDone && (
              <EuiBadge className="all-done-badge" css={allDoneTextStyles} color="success">
                {ALL_DONE_TEXT}
              </EuiBadge>
            )}
            <EuiButtonIcon
              className="eui-displayInlineBlock toggle-button"
              color="primary"
              onClick={toggleStep}
              iconType={isExpandedStep ? 'arrowUp' : 'arrowDown'}
              aria-label={isExpandedStep ? COLLAPSE_STEP_BUTTON_LABEL : EXPAND_STEP_BUTTON_LABEL}
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
              description={description}
              indicesExist={indicesExist}
              sectionId={sectionId}
              splitPanel={splitPanel}
              stepId={stepId}
              toggleTaskCompleteStatus={toggleTaskCompleteStatus}
            />
          </div>
        </div>
      )}
    </EuiPanel>
  );
};

CardStepComponent.displayName = 'CardStepComponent';

export const CardStep = React.memo(CardStepComponent);
