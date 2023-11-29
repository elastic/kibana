/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React, { useMemo } from 'react';
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
import type { ProductLine } from '../../common/product';
import { CardStep } from './card_step';
import { useCardItemStyles } from './styles/card_item.styles';

const CardItemComponent: React.FC<{
  activeProducts: Set<ProductLine>;
  activeStepIds: StepId[] | undefined;
  cardId: CardId;
  expandedCardSteps: ExpandedCardSteps;
  finishedSteps: Set<StepId>;
  toggleTaskCompleteStatus: ToggleTaskCompleteStatus;
  onStepClicked: OnStepClicked;
  sectionId: SectionId;
}> = ({
  activeProducts,
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

  const cardClassNames = classnames('card-item', {
    'card-expanded': isExpandedCard,
  });

  const cardItemPanelStyle = useCardItemStyles();

  return cardItem && activeStepIds ? (
    <EuiPanel
      className={cardClassNames}
      hasBorder
      paddingSize="none"
      css={cardItemPanelStyle}
      borderRadius="none"
      data-test-subj={cardId}
    >
      <EuiFlexGroup gutterSize="s" direction="column">
        <EuiFlexItem>
          {activeStepIds.map((stepId) => {
            return (
              <CardStep
                activeProducts={activeProducts}
                cardId={cardItem.id}
                expandedSteps={expandedSteps}
                finishedSteps={finishedSteps}
                isExpandedCard={isExpandedCard}
                key={stepId}
                toggleTaskCompleteStatus={toggleTaskCompleteStatus}
                onStepClicked={onStepClicked}
                sectionId={sectionId}
                stepId={stepId}
              />
            );
          })}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  ) : null;
};

CardItemComponent.displayName = 'CardItemComponent';
export const CardItem = React.memo(CardItemComponent);
