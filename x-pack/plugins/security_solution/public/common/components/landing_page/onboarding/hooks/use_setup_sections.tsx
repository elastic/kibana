/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiThemeComputed } from '@elastic/eui';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React, { useCallback } from 'react';
import { css } from '@emotion/css';
import type {
  ActiveSections,
  ToggleTaskCompleteStatus,
  OnCardClicked,
  SectionId,
  Section,
  Card,
  CardId,
} from '../types';

import { getCardById, getSectionById } from '../sections';
import { CardWrapper } from '../card_wrapper';

export const useSetUpSections = ({ euiTheme }: { euiTheme: EuiThemeComputed }) => {
  const setUpCards = useCallback(
    ({
      activeCardIds,
      toggleTaskCompleteStatus,
      onCardClicked,
      sectionId,
    }: {
      activeCardIds: CardId[];
      toggleTaskCompleteStatus: ToggleTaskCompleteStatus;
      onCardClicked: OnCardClicked;
      sectionId: SectionId;
    }) =>
      activeCardIds.map<React.ReactNode>((cardId) => {
        const cardItem = getCardById(cardId) as Card;
        return (
          <EuiFlexItem key={cardItem.id}>
            <CardWrapper
              card={cardItem}
              toggleTaskCompleteStatus={toggleTaskCompleteStatus}
              onCardClicked={onCardClicked}
              sectionId={sectionId}
            />
          </EuiFlexItem>
        );
      }),
    []
  );

  const setUpSections = useCallback(
    ({
      activeSections,
      toggleTaskCompleteStatus,
      onCardClicked,
    }: {
      activeSections: ActiveSections | null;
      toggleTaskCompleteStatus: ToggleTaskCompleteStatus;
      onCardClicked: OnCardClicked;
    }) =>
      Object.entries(activeSections ?? {}).map<React.ReactNode>(([sectionId, cardIds]) => {
        const currentSection = getSectionById(sectionId as SectionId) as Section;
        const cardNodes = setUpCards({
          activeCardIds: cardIds,
          toggleTaskCompleteStatus,
          onCardClicked,
          sectionId: currentSection.id,
        });
        return (
          <EuiPanel
            color="plain"
            element="div"
            grow={false}
            paddingSize="none"
            hasShadow={false}
            borderRadius="none"
            css={css`
              margin: ${euiTheme.size.l} 0;
              padding-top: 4px;
              background-color: ${euiTheme.colors.lightestShade};
            `}
            key={sectionId}
            id={sectionId}
            data-test-subj={`section-${sectionId}`}
          >
            <h2
              css={css`
                font-size: ${euiTheme.base * 1.375}px;
                font-weight: ${euiTheme.font.weight.bold};
              `}
            >
              {currentSection.title}
            </h2>
            <EuiSpacer size="l" />
            <EuiFlexGroup
              gutterSize="none"
              direction="column"
              css={css`
                gap: ${euiTheme.size.base};
              `}
            >
              {cardNodes}
            </EuiFlexGroup>
          </EuiPanel>
        );
      }, []),
    [
      euiTheme.base,
      euiTheme.colors.lightestShade,
      euiTheme.font.weight.bold,
      euiTheme.size.base,
      euiTheme.size.l,
      setUpCards,
    ]
  );

  return { setUpSections };
};
