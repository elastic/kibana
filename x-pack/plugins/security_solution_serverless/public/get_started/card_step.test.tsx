/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { CardStep } from './card_step';
import type { StepId } from './types';
import { GetSetUpCardId, IntroductionSteps, SectionId } from './types';

describe('CardStepComponent', () => {
  const step = {
    id: IntroductionSteps.getToKnowElasticSecurity,
    title: 'Test Step',
    badges: [
      { id: 'badge1', name: 'Badge 1' },
      { id: 'badge2', name: 'Badge 2' },
    ],
    description: ['Description line 1', 'Description line 2'],
    splitPanel: <div>{'Split Panel'}</div>,
  };

  const onStepClicked = jest.fn();
  const onStepButtonClicked = jest.fn();
  const props = {
    sectionId: SectionId.getSetUp,
    cardId: GetSetUpCardId.introduction,
    step,
    onStepClicked,
    onStepButtonClicked,
    finishedStepsByCard: new Set() as Set<StepId>,
  };

  it('should toggle step expansion on click', () => {
    const { getByText } = render(<CardStep {...props} />);

    const stepTitle = getByText('Test Step');
    fireEvent.click(stepTitle);

    expect(onStepClicked).toHaveBeenCalledTimes(1);
    expect(onStepClicked).toHaveBeenCalledWith({
      sectionId: SectionId.getSetUp,
      stepId: IntroductionSteps.getToKnowElasticSecurity,
      cardId: GetSetUpCardId.introduction,
    });
  });

  it('should render step title, badges, and description when expanded', () => {
    const { getByText } = render(<CardStep {...props} />);

    const stepTitle = getByText('Test Step');
    fireEvent.click(stepTitle);

    const badge1 = getByText('Badge 1');
    const badge2 = getByText('Badge 2');
    expect(badge1).toBeInTheDocument();
    expect(badge2).toBeInTheDocument();

    const description1 = getByText('Description line 1');
    const description2 = getByText('Description line 2');
    expect(description1).toBeInTheDocument();
    expect(description2).toBeInTheDocument();
  });

  it('should render split panel when expanded', () => {
    const { getByText, queryByText } = render(<CardStep {...props} />);

    const stepTitle = getByText('Test Step');
    fireEvent.click(stepTitle);

    const splitPanel = getByText('Split Panel');
    expect(splitPanel).toBeInTheDocument();

    fireEvent.click(stepTitle);

    expect(queryByText('Split Panel')).not.toBeInTheDocument();
  });

  it('should render check icon when stepId is in finishedStepsByCard', () => {
    const finishedStepsByCard = new Set([IntroductionSteps.getToKnowElasticSecurity]);

    const { getByTestId } = render(
      <CardStep {...props} finishedStepsByCard={finishedStepsByCard} />
    );

    const checkIcon = getByTestId(`${step.id}-icon`);
    expect(checkIcon.getAttribute('data-euiicon-type')).toEqual('checkInCircleFilled');
  });
});
