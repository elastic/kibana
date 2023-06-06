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
import { Card, TogglePanelId } from './types';

import { CardItem } from './card_item';

import { sections } from './sections';

export const useSetUpCardSections = ({
  euiTheme,
  shadow = '',
}: {
  euiTheme: EuiThemeComputed;
  shadow?: string;
}) => {
  const setUpCards = useCallback(
    (
      cards: Card[] | undefined,
      activeSections: Set<TogglePanelId>,
      onStepClicked: (params: { stepId: string; cardId: string }) => void,
      finishedSteps: Record<string, Set<string>>
    ) =>
      cards?.reduce<React.ReactNode[]>((acc, cardItem) => {
        if (cardItem?.activeConditions?.some((condition) => activeSections.has(condition))) {
          const stepsDone = finishedSteps[cardItem.id] ?? 0;
          const timeInMins =
            cardItem?.steps?.reduce(
              (totalMin, { timeInMinutes, id: stepId }) =>
                (totalMin += stepsDone.has(stepId) ? 0 : timeInMinutes ?? 0),
              0
            ) ?? 0;
          const stepsLeft = (cardItem?.steps?.length ?? 0) - (stepsDone?.size ?? 0);

          acc.push(
            <EuiFlexItem key={cardItem.id}>
              <CardItem
                stepsLeft={stepsLeft}
                timeInMins={timeInMins}
                cardItem={cardItem}
                shadow={shadow}
                euiTheme={euiTheme}
                onStepClicked={onStepClicked}
                finishedSteps={finishedSteps}
              />
            </EuiFlexItem>
          );
        }
        return acc;
      }, []),
    [euiTheme, shadow]
  );

  const setUpSections = useCallback(
    (
      activeSections: Set<TogglePanelId>,
      addFinishedStep: (params: { stepId: string; cardId: string }) => void,
      finishedSteps: Record<string, Set<string>>
    ) =>
      activeSections.size > 0
        ? sections.reduce<React.ReactNode[]>((acc, currentSection) => {
            const cardNodes = setUpCards(
              currentSection.cards,
              activeSections,
              addFinishedStep,
              finishedSteps
            );
            if (cardNodes && cardNodes.length > 0) {
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
          }, [])
        : null,
    [euiTheme.size.base, euiTheme.size.l, setUpCards]
  );

  return { setUpCards, setUpSections };
};
