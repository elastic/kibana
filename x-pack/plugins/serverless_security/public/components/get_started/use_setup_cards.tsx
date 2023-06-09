/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiThemeComputed } from '@elastic/eui';
import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import { Card, CardId, Section, StepId } from './types';

import { CardItem } from './card_item';

export const useSetUpCardSections = ({
  euiTheme,
  shadow = '',
}: {
  euiTheme: EuiThemeComputed;
  shadow?: string;
}) => {
  const setUpCards = useCallback(
    ({
      cards,
      onStepClicked,
      finishedSteps,
    }: {
      cards: Card[] | undefined;
      onStepClicked: (params: { stepId: StepId; cardId: CardId }) => void;
      finishedSteps: Record<CardId, Set<StepId>>;
    }) =>
      cards?.map<React.ReactNode>((cardItem) => (
        <EuiFlexItem key={cardItem.id}>
          <CardItem
            data-test-subj={cardItem.id}
            stepsLeft={cardItem.stepsLeft}
            timeInMins={cardItem.timeInMins}
            cardItem={cardItem}
            shadow={shadow}
            euiTheme={euiTheme}
            onStepClicked={onStepClicked}
            finishedSteps={finishedSteps}
          />
        </EuiFlexItem>
      )),
    [euiTheme, shadow]
  );

  const setUpSections = useCallback(
    ({
      onStepClicked,
      finishedSteps,
      sections,
    }: {
      onStepClicked: (params: { stepId: StepId; cardId: CardId }) => void;
      finishedSteps: Record<CardId, Set<StepId>>;
      sections: Section[] | null;
    }) =>
      sections?.reduce<React.ReactNode[]>((acc, currentSection) => {
        const cardNodes = setUpCards({ cards: currentSection.cards, onStepClicked, finishedSteps });
        if (currentSection.cards && currentSection.cards.length > 0) {
          acc.push(
            <EuiPanel
              color="plain"
              element="div"
              grow={false}
              paddingSize="none"
              hasShadow={false}
              borderRadius="none"
              css={css`
                margin: ${euiTheme.size.l} 0;
              `}
              key={currentSection.id}
            >
              <EuiTitle size="xxs">
                <span>{currentSection.title}</span>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiFlexGroup
                gutterSize="m"
                direction="column"
                css={css`
                  ${euiTheme.size.base}
                `}
              >
                {cardNodes}
              </EuiFlexGroup>
            </EuiPanel>
          );
        }
        return acc;
      }, []),
    [euiTheme.size.base, euiTheme.size.l, setUpCards]
  );

  return { setUpSections };
};
