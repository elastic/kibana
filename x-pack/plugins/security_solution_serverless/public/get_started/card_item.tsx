/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import type {
  CardId,
  ExpandedCardSteps,
  OnCardClicked,
  OnStepButtonClicked,
  OnStepClicked,
  SectionId,
  StepId,
} from './types';
import * as i18n from './translations';
import { CardStep } from './card_step';
import { getCard } from './helpers';
import type { ProductLine } from '../../common/product';

const CardItemComponent: React.FC<{
  activeProducts: Set<ProductLine>;
  activeStepIds: StepId[] | undefined;
  cardId: CardId;
  euiTheme: EuiThemeComputed;
  expandedCardSteps: ExpandedCardSteps;
  finishedSteps: Record<CardId, Set<StepId>>;
  onCardClicked: OnCardClicked;
  onStepButtonClicked: OnStepButtonClicked;
  onStepClicked: OnStepClicked;
  sectionId: SectionId;
  shadow?: string;
  stepsLeft?: number;
  timeInMins?: number;
}> = ({
  activeProducts,
  activeStepIds,
  cardId,
  euiTheme,
  expandedCardSteps,
  finishedSteps,
  onCardClicked,
  onStepButtonClicked,
  onStepClicked,
  sectionId,
  shadow,
  stepsLeft,
  timeInMins,
}) => {
  const cardItem = useMemo(() => getCard({ cardId, sectionId }), [cardId, sectionId]);
  const expandCard = expandedCardSteps[cardId]?.isExpanded ?? false;
  const expandedSteps = useMemo(
    () => new Set(expandedCardSteps[cardId]?.expandedSteps ?? []),
    [cardId, expandedCardSteps]
  );
  const toggleCard = useCallback(
    (e) => {
      e.preventDefault();
      const isExpanded = !expandCard;
      onCardClicked({ cardId, isExpanded });
    },
    [cardId, expandCard, onCardClicked]
  );
  const hasActiveSteps = activeStepIds != null && activeStepIds.length > 0;
  return cardItem && hasActiveSteps ? (
    <EuiPanel
      hasBorder
      paddingSize="none"
      css={css`
        ${shadow ?? ''};
        padding: ${euiTheme.size.base} ${euiTheme.size.l} ${euiTheme.size.l};
        margin-bottom: ${euiTheme.size.xs};
        border-radius: ${euiTheme.size.xs};
      `}
      data-test-subj={`card-${cardItem.id}`}
      borderRadius="none"
    >
      <EuiFlexGroup gutterSize="s" direction="column">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            onClick={toggleCard}
            css={css`
              cursor: pointer;
            `}
            gutterSize="m"
          >
            <EuiFlexItem grow={false}>
              {cardItem.icon && (
                <EuiIcon {...cardItem.icon} size="xl" className="eui-alignMiddle" />
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <EuiTitle
                size="xxs"
                css={css`
                  line-height: ${euiTheme.base * 2}px;
                `}
              >
                <h4>{cardItem.title}</h4>
              </EuiTitle>
            </EuiFlexItem>
            {(timeInMins != null || stepsLeft != null) && (
              <EuiFlexItem
                css={css`
                  align-items: end;
                `}
              >
                <EuiText
                  size="s"
                  css={css`
                    line-height: ${euiTheme.base * 2}px;
                  `}
                >
                  {stepsLeft != null && stepsLeft > 0 && (
                    <strong>{i18n.STEPS_LEFT(stepsLeft)}</strong>
                  )}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        {expandCard && hasActiveSteps && (
          <EuiFlexItem>
            {[...activeStepIds].map((stepId) => {
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
        )}
      </EuiFlexGroup>
    </EuiPanel>
  ) : null;
};

CardItemComponent.displayName = 'CardItemComponent';
export const CardItem = React.memo(CardItemComponent);
