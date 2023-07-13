/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import type { ActiveCards, CardId, SectionId, StepId } from './types';

import { CardItem } from './card_item';
import { getSections } from './sections';

export const useSetUpCardSections = ({
  euiTheme,
  shadow = '',
}: {
  euiTheme: EuiThemeComputed;
  shadow?: string;
}) => {
  const setUpCards = useCallback(
    ({
      onStepClicked,
      finishedSteps,
      activeCards,
      sectionId,
    }: {
      onStepClicked: (params: { stepId: StepId; cardId: CardId; sectionId: SectionId }) => void;
      finishedSteps: Record<CardId, Set<StepId>>;
      activeCards: ActiveCards | null;
      sectionId: SectionId;
    }) => {
      const section = activeCards?.[sectionId];
      return section
        ? Object.values(section)?.map<React.ReactNode>((cardItem) => (
            <EuiFlexItem key={cardItem.id}>
              <CardItem
                data-test-subj={cardItem.id}
                stepsLeft={cardItem.stepsLeft}
                timeInMins={cardItem.timeInMins}
                sectionId={sectionId}
                cardId={cardItem.id}
                shadow={shadow}
                euiTheme={euiTheme}
                onStepClicked={onStepClicked}
                finishedSteps={finishedSteps}
              />
            </EuiFlexItem>
          ))
        : null;
    },
    [euiTheme, shadow]
  );

  const setUpSections = useCallback(
    ({
      onStepClicked,
      finishedSteps,
      activeCards,
    }: {
      onStepClicked: (params: { stepId: StepId; cardId: CardId; sectionId: SectionId }) => void;
      finishedSteps: Record<CardId, Set<StepId>>;
      activeCards: ActiveCards | null;
    }) =>
      getSections().reduce<React.ReactNode[]>((acc, currentSection) => {
        const cardNodes = setUpCards({
          sectionId: currentSection.id,
          onStepClicked,
          finishedSteps,
          activeCards,
        });
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
              data-test-subj={`section-${currentSection.id}`}
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
