/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, useEuiShadow } from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import React, { useMemo } from 'react';
import { css } from '@emotion/react';
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

const SHADOW_ANIMATION_DURATION = 350;

const CardItemComponent: React.FC<{
  activeProducts: Set<ProductLine>;
  activeStepIds: StepId[] | undefined;
  cardId: CardId;
  euiTheme: EuiThemeComputed;
  expandedCardSteps: ExpandedCardSteps;
  finishedSteps: Set<StepId>;
  toggleTaskCompleteStatus: ToggleTaskCompleteStatus;
  onStepClicked: OnStepClicked;
  sectionId: SectionId;
}> = ({
  activeProducts,
  activeStepIds,
  cardId,
  euiTheme,
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

  const shadow = useEuiShadow('l');
  const cardClassNames = classnames({
    'card-expanded': isExpandedCard,
  });

  return cardItem && activeStepIds ? (
    <EuiPanel
      className={cardClassNames}
      hasBorder
      paddingSize="none"
      css={css`
        padding: ${euiTheme.size.base};
        margin-bottom: ${euiTheme.size.xs};
        border-radius: ${euiTheme.size.s};
        border: 1px solid ${euiTheme.colors.lightShade};
        box-sizing: content-box;

        &:hover,
        &.card-expanded {
          ${shadow};
          transition: box-shadow ${SHADOW_ANIMATION_DURATION}ms ease-out;
        }

        &.card-expanded {
          border: 2px solid #6092c0;
        }
      `}
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
