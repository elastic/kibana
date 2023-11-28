/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { CardStep } from '.';
import type { StepId } from '../types';
import { QuickStartSectionCardsId, SectionId, OverviewSteps, CreateProjectSteps } from '../types';
import { ProductLine } from '../../../common/product';

jest.mock('../../common/services');
jest.mock('../context/step_context');
jest.mock('./step_content', () => ({
  StepContent: () => <div data-test-subj="mock-step-content" />,
}));

describe('CardStepComponent', () => {
  const step = {
    id: OverviewSteps.getToKnowElasticSecurity,
  };

  const onStepClicked = jest.fn();
  const toggleTaskCompleteStatus = jest.fn();
  const expandedSteps = new Set([]);

  const props = {
    activeProducts: new Set([ProductLine.security]),
    cardId: QuickStartSectionCardsId.watchTheOverviewVideo,
    expandedSteps,
    finishedSteps: new Set<StepId>(),
    isExpandedCard: true,
    toggleTaskCompleteStatus,
    onStepClicked,
    sectionId: SectionId.quickStart,
    stepId: step.id,
  };
  const testStepTitle = 'Watch the overview video';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should toggle step expansion on click', () => {
    const { getByText } = render(<CardStep {...props} />);

    const stepTitle = getByText(testStepTitle);
    fireEvent.click(stepTitle);

    expect(onStepClicked).toHaveBeenCalledTimes(1);
    expect(onStepClicked).toHaveBeenCalledWith({
      sectionId: SectionId.quickStart,
      stepId: OverviewSteps.getToKnowElasticSecurity,
      cardId: QuickStartSectionCardsId.watchTheOverviewVideo,
      isExpanded: true,
    });
  });

  it('should render step content when expanded', () => {
    const { getByText, getByTestId } = render(<CardStep {...props} />);

    const stepTitle = getByText(testStepTitle);
    fireEvent.click(stepTitle);

    const content = getByTestId('mock-step-content');

    expect(content).toBeInTheDocument();
  });

  it('should not toggle step expansion on click when there is no content', () => {
    const mockProps = {
      ...props,
      stepId: CreateProjectSteps.createFirstProject,
      cardId: QuickStartSectionCardsId.createFirstProject,
      finishedSteps: new Set<StepId>([CreateProjectSteps.createFirstProject]),
      description: undefined,
      splitPanel: undefined,
    };
    const { getByText } = render(<CardStep {...mockProps} />);

    const stepTitle = getByText('Create your first project');
    fireEvent.click(stepTitle);

    expect(onStepClicked).toHaveBeenCalledTimes(0);
  });
});
