/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { CardItem } from './card_item';
import type { ExpandedSteps, StepId } from './types';

import { QuickStartSectionCardsId, SectionId, OverviewSteps } from './types';
jest.mock('./card_step');

describe('CardItemComponent', () => {
  const finishedSteps = new Set([]) as Set<StepId>;
  const onStepClicked = jest.fn();
  const toggleTaskCompleteStatus = jest.fn();
  const expandedSteps = {
    [QuickStartSectionCardsId.watchTheOverviewVideo]: {
      isExpanded: false,
      expandedSteps: [] as StepId[],
    },
  } as ExpandedSteps;

  it('should render card', () => {
    const { getByTestId } = render(
      <CardItem
        activeStepIds={[OverviewSteps.getToKnowElasticSecurity]}
        cardId={QuickStartSectionCardsId.watchTheOverviewVideo}
        expandedSteps={expandedSteps}
        finishedSteps={finishedSteps}
        toggleTaskCompleteStatus={toggleTaskCompleteStatus}
        onStepClicked={onStepClicked}
        sectionId={SectionId.quickStart}
      />
    );

    const cardTitle = getByTestId(QuickStartSectionCardsId.watchTheOverviewVideo);
    expect(cardTitle).toBeInTheDocument();
  });

  it('should not render card when no active steps', () => {
    const { queryByText } = render(
      <CardItem
        activeStepIds={[]}
        cardId={QuickStartSectionCardsId.watchTheOverviewVideo}
        expandedSteps={expandedSteps}
        finishedSteps={new Set([])}
        toggleTaskCompleteStatus={toggleTaskCompleteStatus}
        onStepClicked={onStepClicked}
        sectionId={SectionId.quickStart}
      />
    );

    const cardTitle = queryByText('Introduction');
    expect(cardTitle).not.toBeInTheDocument();
  });
});
