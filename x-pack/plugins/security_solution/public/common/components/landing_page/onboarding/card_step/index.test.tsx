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

import {
  EnablePrebuiltRulesSteps,
  GetStartedWithAlertsCardsId,
  QuickStartSectionCardsId,
  SectionId,
  OverviewSteps,
  CreateProjectSteps,
} from '../types';
import { ALL_DONE_TEXT } from '../translations';
import { fetchRuleManagementFilters } from '../apis';
import { createProjectSteps, enablePrebuildRuleSteps, overviewVideoSteps } from '../sections';

jest.mock('./step_content', () => ({
  StepContent: () => <div data-test-subj="mock-step-content" />,
}));

jest.mock('../context/step_context');
jest.mock('../apis');

jest.mock('../../../../lib/kibana');

jest.mock('@kbn/security-solution-navigation', () => ({
  useNavigateTo: jest.fn().mockReturnValue({ navigateTo: jest.fn() }),
  SecurityPageName: {
    landing: 'landing',
  },
}));

describe('CardStepComponent', () => {
  const onStepClicked = jest.fn();
  const toggleTaskCompleteStatus = jest.fn();
  const expandedSteps = new Set([]);

  const props = {
    cardId: QuickStartSectionCardsId.watchTheOverviewVideo,
    expandedSteps,
    finishedSteps: new Set<StepId>(),
    isExpandedCard: true,
    toggleTaskCompleteStatus,
    onStepClicked,
    sectionId: SectionId.quickStart,
    step: overviewVideoSteps[0],
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
      trigger: 'click',
    });
  });

  it('should render step content when expanded', () => {
    const mockProps = {
      ...props,
      expandedSteps: new Set([
        QuickStartSectionCardsId.watchTheOverviewVideo,
      ]) as unknown as Set<StepId>,
    };
    const { getByTestId } = render(<CardStep {...mockProps} />);

    const content = getByTestId('mock-step-content');

    expect(content).toBeInTheDocument();
  });

  it('should not toggle step expansion on click when there is no content', () => {
    const mockProps = {
      ...props,
      stepId: CreateProjectSteps.createFirstProject,
      cardId: QuickStartSectionCardsId.createFirstProject,
      finishedSteps: new Set<StepId>([CreateProjectSteps.createFirstProject]),
      step: { ...createProjectSteps[0], description: undefined, splitPanel: undefined },
    };
    const { getByText } = render(<CardStep {...mockProps} />);

    const stepTitle = getByText('Create your first project');
    fireEvent.click(stepTitle);

    expect(onStepClicked).toHaveBeenCalledTimes(0);
  });

  it('should not show the step as completed when it is not', () => {
    const { queryByText } = render(<CardStep {...props} />);

    const text = queryByText(ALL_DONE_TEXT);
    expect(text).not.toBeInTheDocument();
  });

  it('should show the step as completed when it is done', async () => {
    (fetchRuleManagementFilters as jest.Mock).mockResolvedValue({
      total: 1,
    });
    const mockProps = {
      ...props,
      cardId: GetStartedWithAlertsCardsId.enablePrebuiltRules,
      finishedSteps: new Set<StepId>([EnablePrebuiltRulesSteps.enablePrebuiltRules]),
      sectionId: SectionId.getStartedWithAlerts,
      step: enablePrebuildRuleSteps[0],
    };
    const { queryByText } = render(<CardStep {...mockProps} />);

    const text = queryByText(ALL_DONE_TEXT);
    expect(text).toBeInTheDocument();
  });
});
