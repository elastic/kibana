/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { CardItem } from './card_item';
import type { CardId, ExpandedCardSteps, StepId } from './types';
import { GetSetUpCardId, IntroductionSteps, SectionId } from './types';
import type { EuiThemeComputed } from '@elastic/eui';
import { introductionSteps } from './sections';
import { ProductLine } from '../../common/product';
jest.mock('./card_step');

describe('CardItemComponent', () => {
  const finishedSteps = {} as Record<CardId, Set<StepId>>;
  const onCardStepClicked = jest.fn();
  const onStepClicked = jest.fn();
  const onStepButtonClicked = jest.fn();
  const expandedCardSteps = {
    [GetSetUpCardId.introduction]: {
      isExpanded: false,
      expandedSteps: [] as StepId[],
    },
  } as ExpandedCardSteps;

  const mockEuiTheme = { size: { xxs: '4px' }, base: 16 } as EuiThemeComputed;
  it('should render card', () => {
    const { getByText, queryByText } = render(
      <CardItem
        activeProducts={new Set([ProductLine.security])}
        activeStepIds={introductionSteps.map((step) => step.id)}
        cardId={GetSetUpCardId.introduction}
        expandedCardSteps={expandedCardSteps}
        euiTheme={mockEuiTheme}
        finishedSteps={finishedSteps}
        onCardClicked={onCardStepClicked}
        onStepButtonClicked={onStepButtonClicked}
        onStepClicked={onStepClicked}
        sectionId={SectionId.getSetUp}
        shadow=""
        stepsLeft={1}
        timeInMins={30}
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

  it('should not render card when no active steps', () => {
    const { queryByText } = render(
      <CardItem
        activeProducts={new Set([])}
        activeStepIds={[]}
        cardId={GetSetUpCardId.introduction}
        expandedCardSteps={expandedCardSteps}
        euiTheme={mockEuiTheme}
        finishedSteps={finishedSteps}
        onCardClicked={onCardStepClicked}
        onStepButtonClicked={onStepButtonClicked}
        onStepClicked={onStepClicked}
        sectionId={SectionId.getSetUp}
        shadow=""
        stepsLeft={1}
        timeInMins={30}
      />
    );

    const cardTitle = queryByText('Introduction');
    expect(cardTitle).not.toBeInTheDocument();
  });

  it('should not render steps left information when all steps are done', () => {
    const mockFinishedSteps = {
      [GetSetUpCardId.introduction]: new Set([IntroductionSteps.getToKnowElasticSecurity]),
    } as Record<CardId, Set<StepId>>;

    const { getByText, queryByText } = render(
      <CardItem
        activeProducts={new Set([ProductLine.security])}
        activeStepIds={introductionSteps.map((step) => step.id)}
        cardId={GetSetUpCardId.introduction}
        sectionId={SectionId.getSetUp}
        expandedCardSteps={expandedCardSteps}
        euiTheme={mockEuiTheme}
        shadow=""
        stepsLeft={0}
        timeInMins={0}
        onCardClicked={onCardStepClicked}
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

  it('should toggle step expansion on click', () => {
    const testCardTitle = 'Introduction';
    const { getByText } = render(
      <CardItem
        activeProducts={new Set([ProductLine.security])}
        activeStepIds={introductionSteps.map((step) => step.id)}
        expandedCardSteps={expandedCardSteps}
        cardId={GetSetUpCardId.introduction}
        sectionId={SectionId.getSetUp}
        euiTheme={mockEuiTheme}
        shadow=""
        stepsLeft={0}
        timeInMins={0}
        onCardClicked={onCardStepClicked}
        onStepClicked={onStepClicked}
        onStepButtonClicked={onStepButtonClicked}
        finishedSteps={finishedSteps}
      />
    );

    const stepTitle = getByText(testCardTitle);
    fireEvent.click(stepTitle);

    expect(onCardStepClicked).toHaveBeenCalledTimes(1);
    expect(onCardStepClicked).toHaveBeenCalledWith({
      cardId: GetSetUpCardId.introduction,
      isExpanded: true,
    });
  });
});
