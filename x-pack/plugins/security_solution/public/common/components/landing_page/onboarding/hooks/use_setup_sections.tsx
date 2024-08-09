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
  CardId,
  ExpandedCards,
  ToggleTaskCompleteStatus,
  OnCardClicked,
  SectionId,
} from '../types';

import { getSections } from '../sections';
import { CardStep } from '../card_step';

export const useSetUpSections = ({ euiTheme }: { euiTheme: EuiThemeComputed }) => {
  const setUpCards = useCallback(
    ({
      activeSections,
      expandedCards,
      finishedCardIds,
      toggleTaskCompleteStatus,
      onCardClicked,
      sectionId,
    }: {
      activeSections: ActiveSections | null;
      expandedCards: ExpandedCards;
      finishedCardIds: Set<CardId>;
      toggleTaskCompleteStatus: ToggleTaskCompleteStatus;
      onCardClicked: OnCardClicked;
      sectionId: SectionId;
    }) => {
      const section = activeSections?.[sectionId];
      return section
        ? Object.values(section)?.map<React.ReactNode>((cardItem) => (
            <EuiFlexItem key={cardItem.id}>
              <CardStep
                card={cardItem}
                expandedCards={expandedCards}
                finishedCardIds={finishedCardIds}
                toggleTaskCompleteStatus={toggleTaskCompleteStatus}
                onCardClicked={onCardClicked}
                sectionId={sectionId}
              />
            </EuiFlexItem>
          ))
        : null;
    },
    []
  );

  const setUpSections = useCallback(
    ({
      activeSections,
      expandedCards,
      finishedCardIds,
      toggleTaskCompleteStatus,
      onCardClicked,
    }: {
      activeSections: ActiveSections | null;
      expandedCards: ExpandedCards;
      finishedCardIds: Set<CardId>;
      toggleTaskCompleteStatus: ToggleTaskCompleteStatus;
      onCardClicked: OnCardClicked;
    }) =>
      getSections().reduce<React.ReactNode[]>((acc, currentSection) => {
        const cardNodes = setUpCards({
          activeSections,
          expandedCards,
          finishedCardIds,
          toggleTaskCompleteStatus,
          onCardClicked,
          sectionId: currentSection.id,
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
                padding-top: 4px;
                background-color: ${euiTheme.colors.lightestShade};
              `}
              key={currentSection.id}
              id={currentSection.id}
              data-test-subj={`section-${currentSection.id}`}
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
        }
        return acc;
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
