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
  ExpandedCardSteps,
  ToggleTaskCompleteStatus,
  OnStepClicked,
  SectionId,
  StepId,
} from '../types';

import { CardItem } from '../card_item';
import { getSections } from '../sections';

export const useSetUpSections = ({ euiTheme }: { euiTheme: EuiThemeComputed }) => {
  const setUpCards = useCallback(
    ({
      activeSections,
      expandedCardSteps,
      finishedSteps,
      toggleTaskCompleteStatus,
      onStepClicked,
      sectionId,
    }: {
      activeSections: ActiveSections | null;
      expandedCardSteps: ExpandedCardSteps;
      finishedSteps: Record<CardId, Set<StepId>>;
      toggleTaskCompleteStatus: ToggleTaskCompleteStatus;
      onStepClicked: OnStepClicked;
      sectionId: SectionId;
    }) => {
      const section = activeSections?.[sectionId];
      return section
        ? Object.values(section)?.map<React.ReactNode>((cardItem) => (
            <EuiFlexItem key={cardItem.id}>
              <CardItem
                activeStepIds={cardItem.activeStepIds}
                cardId={cardItem.id}
                data-test-subj={cardItem.id}
                expandedCardSteps={expandedCardSteps}
                finishedSteps={finishedSteps[cardItem.id]}
                toggleTaskCompleteStatus={toggleTaskCompleteStatus}
                onStepClicked={onStepClicked}
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
      expandedCardSteps,
      finishedSteps,
      toggleTaskCompleteStatus,
      onStepClicked,
    }: {
      activeSections: ActiveSections | null;
      expandedCardSteps: ExpandedCardSteps;
      finishedSteps: Record<CardId, Set<StepId>>;
      toggleTaskCompleteStatus: ToggleTaskCompleteStatus;
      onStepClicked: OnStepClicked;
    }) =>
      getSections().reduce<React.ReactNode[]>((acc, currentSection) => {
        const cardNodes = setUpCards({
          activeSections,
          expandedCardSteps,
          finishedSteps,
          toggleTaskCompleteStatus,
          onStepClicked,
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
              <span
                css={css`
                  font-size: ${euiTheme.base * 1.375}px;
                  font-weight: ${euiTheme.font.weight.bold};
                `}
              >
                {currentSection.title}
              </span>
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
