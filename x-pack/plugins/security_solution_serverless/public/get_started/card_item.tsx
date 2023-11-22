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
  OnStepButtonClicked,
  OnStepClicked,
  SectionId,
  StepId,
} from './types';
import { getCard } from './helpers';
import type { ProductLine } from '../../common/product';
import { CardStep } from './card_step';

const CardItemComponent: React.FC<{
  activeProducts: Set<ProductLine>;
  activeStepIds: StepId[] | undefined;
  cardId: CardId;
  euiTheme: EuiThemeComputed;
  expandedCardSteps: ExpandedCardSteps;
  finishedSteps: Record<CardId, Set<StepId>>;
  onStepButtonClicked: OnStepButtonClicked;
  onStepClicked: OnStepClicked;
  sectionId: SectionId;
}> = ({
  activeProducts,
  activeStepIds,
  cardId,
  euiTheme,
  expandedCardSteps,
  finishedSteps,
  onStepButtonClicked,
  onStepClicked,
  sectionId,
}) => {
  const cardItem = useMemo(() => getCard({ cardId, sectionId }), [cardId, sectionId]);
  const expandedSteps = useMemo(
    () => new Set(expandedCardSteps[cardId]?.expandedSteps ?? []),
    [cardId, expandedCardSteps]
  );
  const hasExpandedSteps = expandedSteps.size > 0;

  const cardClassNames = classnames({
    'card-collapsed': !hasExpandedSteps,
    'card-expanded': hasExpandedSteps,
  });
  const shadow = useEuiShadow('l');

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

        &:hover,
        .card-expanded {
          ${shadow};
        }

        &.card-expanded {
          border: 2px solid #6092c0;
        }
      `}
      data-test-subj={`card-${cardItem.id}`}
      id={cardItem.id}
      borderRadius="none"
    >
      <EuiFlexGroup gutterSize="s" direction="column">
        <EuiFlexItem>
          {activeStepIds.map((stepId) => {
            return (
              <CardStep
                activeProducts={activeProducts}
                cardId={cardItem.id}
                expandedSteps={expandedSteps}
                finishedStepsByCard={finishedSteps[cardItem.id]}
                key={stepId}
                onStepButtonClicked={onStepButtonClicked}
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
