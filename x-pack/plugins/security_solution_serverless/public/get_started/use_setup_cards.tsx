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
import type {
  ActiveSections,
  CardId,
  ExpandedCardSteps,
  OnCardClicked,
  OnStepButtonClicked,
  OnStepClicked,
  SectionId,
  StepId,
} from './types';

import { CardItem } from './card_item';
import { getSections } from './sections';
import type { ProductLine } from '../../common/product';

export const useSetUpSections = ({
  euiTheme,
  shadow = '',
}: {
  euiTheme: EuiThemeComputed;
  shadow?: string;
}) => {
  const setUpCards = useCallback(
    ({
      activeProducts,
      activeSections,
      expandedCardSteps,
      finishedSteps,
      onCardClicked,
      onStepButtonClicked,
      onStepClicked,
      sectionId,
    }: {
      activeProducts: Set<ProductLine>;
      activeSections: ActiveSections | null;
      expandedCardSteps: ExpandedCardSteps;
      finishedSteps: Record<CardId, Set<StepId>>;
      onCardClicked: OnCardClicked;
      onStepButtonClicked: OnStepButtonClicked;
      onStepClicked: OnStepClicked;
      sectionId: SectionId;
    }) => {
      const section = activeSections?.[sectionId];
      return section
        ? Object.values(section)?.map<React.ReactNode>((cardItem) => (
            <EuiFlexItem key={cardItem.id}>
              <CardItem
                activeProducts={activeProducts}
                activeStepIds={cardItem.activeStepIds}
                cardId={cardItem.id}
                data-test-subj={cardItem.id}
                expandedCardSteps={expandedCardSteps}
                euiTheme={euiTheme}
                finishedSteps={finishedSteps}
                onCardClicked={onCardClicked}
                onStepButtonClicked={onStepButtonClicked}
                onStepClicked={onStepClicked}
                sectionId={sectionId}
                shadow={shadow}
                stepsLeft={cardItem.stepsLeft}
                timeInMins={cardItem.timeInMins}
              />
            </EuiFlexItem>
          ))
        : null;
    },
    [euiTheme, shadow]
  );

  const setUpSections = useCallback(
    ({
      activeProducts,
      activeSections,
      expandedCardSteps,
      finishedSteps,
      onCardClicked,
      onStepButtonClicked,
      onStepClicked,
    }: {
      activeProducts: Set<ProductLine>;
      activeSections: ActiveSections | null;
      expandedCardSteps: ExpandedCardSteps;
      finishedSteps: Record<CardId, Set<StepId>>;
      onCardClicked: OnCardClicked;
      onStepButtonClicked: OnStepButtonClicked;
      onStepClicked: OnStepClicked;
    }) =>
      getSections().reduce<React.ReactNode[]>((acc, currentSection) => {
        const cardNodes = setUpCards({
          activeProducts,
          activeSections,
          expandedCardSteps,
          finishedSteps,
          onCardClicked,
          onStepButtonClicked,
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
