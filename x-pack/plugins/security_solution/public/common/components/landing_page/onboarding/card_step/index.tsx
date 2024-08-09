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

import type { CardId, OnCardClicked, ToggleTaskCompleteStatus, SectionId, Card } from '../types';
import { ALL_DONE_TEXT, EXPAND_STEP_BUTTON_LABEL } from '../translations';

import { CardContent } from './step_content';
import { useCheckStepCompleted } from '../hooks/use_check_step_completed';
import { useStepContext } from '../context/step_context';
import { useCardStepStyles } from '../styles/card_step.styles';
import { useCardItemStyles } from '../styles/card_item.styles';

const CardStepComponent: React.FC<{
  card: Card;
  expandedCards: Set<CardId>;
  finishedCardIds: Set<CardId>;
  toggleTaskCompleteStatus: ToggleTaskCompleteStatus;
  onCardClicked: OnCardClicked;
  sectionId: SectionId;
}> = ({
  card,
  expandedCards,
  finishedCardIds = new Set(),
  toggleTaskCompleteStatus,
  onCardClicked,
  sectionId,
}) => {
  const { navigateTo } = useNavigateTo();

  const isExpandedStep = expandedCards.has(card.id);

  const cardItemPanelStyle = useCardItemStyles();

  const { id: stepId, title, description, splitPanel, icon, autoCheckIfCardCompleted } = card;
  const hasCardContent = description != null || splitPanel != null;
  const { indicesExist } = useStepContext();

  useCheckStepCompleted({
    autoCheckIfCardCompleted,
    cardId: card.id,
    indicesExist,
    sectionId,
    cardTitle: title,
    toggleTaskCompleteStatus,
  });

  const isDone = finishedCardIds.has(stepId);

  const toggleStep = useCallback(
    (e) => {
      e.preventDefault();
      const newStatus = !isExpandedStep;

      if (hasCardContent) {
        // Toggle step and sync the expanded card step to storage & reducer
        onCardClicked({ cardId: card.id, sectionId, isExpanded: newStatus, trigger: 'click' });

        navigateTo({
          deepLinkId: SecurityPageName.landing,
          path: newStatus ? `#${stepId}` : undefined,
        });
      }
    },
    [isExpandedStep, hasCardContent, onCardClicked, card.id, sectionId, navigateTo, stepId]
  );

  const {
    stepPanelStyles,
    stepIconStyles,
    stepTitleStyles,
    allDoneTextStyles,
    toggleButtonStyles,
    getCardGroundStyles,
    stepItemStyles,
  } = useCardStepStyles();
  const stepGroundStyles = getCardGroundStyles({ hasCardContent });

  const stepIconClassNames = classnames('step-icon', {
    'step-icon-done': isDone,
    stepIconStyles,
  });

  const stepTitleClassNames = classnames('step-title', stepTitleStyles);
  const allDoneTextNames = classnames('all-done-badge', allDoneTextStyles);

  const panelClassNames = classnames(
    {
      'card-panel-collapsed': !isExpandedStep,
    },
    stepPanelStyles
  );

  const cardClassNames = classnames(
    'card-item',
    {
      'card-expanded': isExpandedStep,
    },
    cardItemPanelStyle,
    panelClassNames
  );

  return (
    <EuiPanel
      className={cardClassNames}
      color="plain"
      grow={false}
      hasShadow={false}
      borderRadius="none"
      paddingSize="none"
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
              isDisabled={!hasCardContent}
            />
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
      {expandedCards.has(card.id) && hasCardContent && (
        <div className="cardContentWrapper">
          <div className="cardContent">
            <CardContent
              autoCheckIfCardCompleted={isExpandedStep ? autoCheckIfCardCompleted : undefined}
              card={card}
              indicesExist={indicesExist}
              sectionId={sectionId}
              toggleTaskCompleteStatus={toggleTaskCompleteStatus}
            />
          </div>
        </div>
      )}
    </EuiPanel>
  );
};

export const CardStep = React.memo(CardStepComponent);
