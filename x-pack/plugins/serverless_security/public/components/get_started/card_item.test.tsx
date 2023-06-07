/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { CardItem } from './card_item';
import { Card, CardId, GetSetUpCardId, IntroductionSteps, Step, StepId } from './types';
import { EuiThemeComputed } from '@elastic/eui';
jest.mock('./card_step');

describe('CardItemComponent', () => {
  const cardItem: Card = {
    id: GetSetUpCardId.introduction,
    title: 'Test Card',
    icon: { type: 'logoElastic' },
    steps: [{ id: IntroductionSteps.watchOverviewVideo, title: 'Step 1' }] as Step[],
  };

  const finishedSteps = {} as Record<CardId, Set<StepId>>;

  const onStepClicked = jest.fn();
  const mockEuiTheme = { size: { xxs: '4px' }, base: 16 } as EuiThemeComputed;
  it('should render card', () => {
    const { getByText, queryByText } = render(
      <CardItem
        cardItem={cardItem}
        euiTheme={mockEuiTheme}
        shadow=""
        stepsLeft={1}
        timeInMins={30}
        onStepClicked={onStepClicked}
        finishedSteps={finishedSteps}
      />
    );

    const cardTitle = getByText('Test Card');
    expect(cardTitle).toBeInTheDocument();

    const step = getByText('1 step left');
    expect(step).toBeInTheDocument();

    const time = getByText('• About 30 mins');
    expect(time).toBeInTheDocument();

    const step1 = queryByText('Step 1');
    expect(step1).not.toBeInTheDocument();
  });

  it('should not render steps left information when all steps done', () => {
    const mockFinishedSteps = {
      [cardItem.id]: new Set([IntroductionSteps.watchOverviewVideo]),
    } as Record<CardId, Set<StepId>>;

    const { getByText, queryByText } = render(
      <CardItem
        cardItem={cardItem}
        euiTheme={mockEuiTheme}
        shadow=""
        stepsLeft={0}
        timeInMins={0}
        onStepClicked={onStepClicked}
        finishedSteps={mockFinishedSteps}
      />
    );

    const cardTitle = getByText('Test Card');
    expect(cardTitle).toBeInTheDocument();

    const step = queryByText('1 step left');
    expect(step).not.toBeInTheDocument();

    const time = queryByText('• About 30 mins');
    expect(time).not.toBeInTheDocument();
  });
});
