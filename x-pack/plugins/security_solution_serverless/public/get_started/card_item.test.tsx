/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { CardItem } from './card_item';
import type { CardId, StepId } from './types';
import { GetSetUpCardId, IntroductionSteps, SectionId } from './types';
import type { EuiThemeComputed } from '@elastic/eui';
jest.mock('./card_step');

describe('CardItemComponent', () => {
  const finishedSteps = {} as Record<CardId, Set<StepId>>;

  const onStepClicked = jest.fn();
  const onStepButtonClicked = jest.fn();
  const mockEuiTheme = { size: { xxs: '4px' }, base: 16 } as EuiThemeComputed;
  it('should render card', () => {
    const { getByText, queryByText } = render(
      <CardItem
        cardId={GetSetUpCardId.introduction}
        sectionId={SectionId.getSetUp}
        euiTheme={mockEuiTheme}
        shadow=""
        stepsLeft={1}
        timeInMins={30}
        onStepClicked={onStepClicked}
        onStepButtonClicked={onStepButtonClicked}
        finishedSteps={finishedSteps}
      />
    );

    const cardTitle = getByText('Introduction');
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
      [GetSetUpCardId.introduction]: new Set([IntroductionSteps.getToKnowElasticSecurity]),
    } as Record<CardId, Set<StepId>>;

    const { getByText, queryByText } = render(
      <CardItem
        cardId={GetSetUpCardId.introduction}
        sectionId={SectionId.getSetUp}
        euiTheme={mockEuiTheme}
        shadow=""
        stepsLeft={0}
        timeInMins={0}
        onStepClicked={onStepClicked}
        onStepButtonClicked={onStepButtonClicked}
        finishedSteps={mockFinishedSteps}
      />
    );

    const cardTitle = getByText('Introduction');
    expect(cardTitle).toBeInTheDocument();

    const step = queryByText('1 step left');
    expect(step).not.toBeInTheDocument();

    const time = queryByText('• About 30 mins');
    expect(time).not.toBeInTheDocument();
  });
});
