/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';

import React, { useMemo, useCallback } from 'react';

import classnames from 'classnames';
import type {
  CardId,
  ExpandedCardSteps,
  ToggleTaskCompleteStatus,
  OnStepClicked,
  SectionId,
  StepId,
} from './types';
import { getCard } from './helpers';
import { CardStep } from './card_step';
import { useCardItemStyles } from './styles/card_item.styles';

export const SHADOW_ANIMATION_DURATION = 350;

const CardItemComponent: React.FC<{
  activeStepIds: StepId[] | undefined;
  cardId: CardId;
  expandedCardSteps: ExpandedCardSteps;
  finishedSteps: Set<StepId>;
  toggleTaskCompleteStatus: ToggleTaskCompleteStatus;
  onStepClicked: OnStepClicked;
  sectionId: SectionId;
}> = ({
  activeStepIds,
  cardId,
  expandedCardSteps,
  finishedSteps,
  toggleTaskCompleteStatus,
  onStepClicked,
  sectionId,
}) => {
  const isExpandedCard = expandedCardSteps[cardId].isExpanded;

  const cardItem = useMemo(() => getCard({ cardId, sectionId }), [cardId, sectionId]);
  const expandedSteps = useMemo(
    () => new Set(expandedCardSteps[cardId]?.expandedSteps ?? []),
    [cardId, expandedCardSteps]
  );
  const cardItemPanelStyle = useCardItemStyles();

  const cardClassNames = classnames(
    'card-item',
    {
      'card-expanded': isExpandedCard,
    },
    cardItemPanelStyle
  );

  const getCardStep = useCallback(
    (stepId: StepId) => cardItem?.steps?.find((step) => step.id === stepId),
    [cardItem?.steps]
  );
  const steps = useMemo(
    () =>
      activeStepIds?.reduce<React.ReactElement[]>((acc, stepId) => {
        const step = getCardStep(stepId);
        if (step && cardItem) {
          acc.push(
            <CardStep
              cardId={cardItem.id}
              expandedSteps={expandedSteps}
              finishedSteps={finishedSteps}
              key={stepId}
              toggleTaskCompleteStatus={toggleTaskCompleteStatus}
              onStepClicked={onStepClicked}
              sectionId={sectionId}
              step={step}
            />
          );
        }
        return acc;
      }, []),
    [
      activeStepIds,
      cardItem,
      expandedSteps,
      finishedSteps,
      getCardStep,
      onStepClicked,
      sectionId,
      toggleTaskCompleteStatus,
    ]
  );

  return cardItem && activeStepIds ? (
    <EuiPanel
      className={cardClassNames}
      hasBorder
      paddingSize="none"
      borderRadius="none"
      data-test-subj={cardId}
    >
      <EuiFlexGroup gutterSize="s" direction="column">
        <EuiFlexItem>{steps}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  ) : null;
};

CardItemComponent.displayName = 'CardItemComponent';
export const CardItem = React.memo(CardItemComponent);
