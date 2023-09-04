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
import { ProductLine } from '../../common/product';

describe('CardStepComponent', () => {
  const step = {
    id: IntroductionSteps.getToKnowElasticSecurity,
  };

  const onStepClicked = jest.fn();
  const onStepButtonClicked = jest.fn();
  const expandedSteps = new Set([IntroductionSteps.getToKnowElasticSecurity]);

  const props = {
    activeProducts: new Set([ProductLine.security]),
    cardId: GetSetUpCardId.introduction,
    expandedSteps,
    finishedStepsByCard: new Set<StepId>(),
    onStepButtonClicked,
    onStepClicked,
    sectionId: SectionId.getSetUp,
    stepId: step.id,
  };
  const testStepTitle = 'Get to know Elastic Security';

  it('should toggle step expansion on click', () => {
    const { getByText } = render(<CardStep {...props} />);

    const stepTitle = getByText(testStepTitle);
    fireEvent.click(stepTitle);

    expect(onStepClicked).toHaveBeenCalledTimes(1);
    expect(onStepClicked).toHaveBeenCalledWith({
      sectionId: SectionId.getSetUp,
      stepId: IntroductionSteps.getToKnowElasticSecurity,
      cardId: GetSetUpCardId.introduction,
      isExpanded: false,
    });
  });

  it('should render step title, badges, and description when expanded', () => {
    const { getByText, getByTestId } = render(<CardStep {...props} />);

    const stepTitle = getByText(testStepTitle);
    fireEvent.click(stepTitle);

    const badge1 = getByText('Analytics');
    const badge2 = getByText('Cloud');
    const badge3 = getByText('EDR');
    expect(badge1).toBeInTheDocument();
    expect(badge2).toBeInTheDocument();
    expect(badge3).toBeInTheDocument();

    const description1 = getByTestId(`${IntroductionSteps.getToKnowElasticSecurity}-description-0`);
    const description2 = getByTestId(`${IntroductionSteps.getToKnowElasticSecurity}-description-1`);
    expect(description1).toBeInTheDocument();
    expect(description2).toBeInTheDocument();
  });

  it('should render expended steps', () => {
    const { getByTestId } = render(<CardStep {...props} />);

    const splitPanel = getByTestId('split-panel');
    expect(splitPanel).toBeInTheDocument();
  });

  it('should render collapsed steps', () => {
    const { queryByTestId } = render(<CardStep {...props} expandedSteps={new Set()} />);

    const splitPanel = queryByTestId('split-panel');
    expect(splitPanel).not.toBeInTheDocument();
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
