/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { TogglePanel } from './toggle_panel';
import { useSetUpSections } from './use_setup_cards';
import type { ActiveSections, CardId, ExpandedCardSteps, StepId } from './types';
import { GetSetUpCardId, IntroductionSteps, SectionId } from './types';
import { ProductLine } from '../../common/product';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: jest.fn(() => ({ euiTheme: { base: 16, size: { xs: '4px' } } })),
  useEuiShadow: jest.fn(),
}));

jest.mock('./use_setup_cards', () => ({
  useSetUpSections: jest.fn(),
}));

const finishedSteps = {
  [GetSetUpCardId.introduction]: new Set([IntroductionSteps.getToKnowElasticSecurity]),
} as unknown as Record<CardId, Set<StepId>>;
const activeProducts = new Set([ProductLine.security, ProductLine.cloud]);

const activeSections = {
  [SectionId.getSetUp]: {
    [GetSetUpCardId.introduction]: {
      id: GetSetUpCardId.introduction,
      timeInMins: 3,
      stepsLeft: 1,
    },
    [GetSetUpCardId.configure]: {
      id: GetSetUpCardId.configure,
      timeInMins: 0,
      stepsLeft: 0,
    },
    [GetSetUpCardId.explore]: {
      id: GetSetUpCardId.explore,
      timeInMins: 0,
      stepsLeft: 0,
    },
  },
} as ActiveSections;

describe('TogglePanel', () => {
  const mockUseSetUpCardSections = {
    setUpSections: jest.fn(() => <div data-test-subj="mock-sections" />),
  };

  const onStepClicked = jest.fn();
  const onStepButtonClicked = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();

    (useSetUpSections as jest.Mock).mockReturnValue(mockUseSetUpCardSections);
  });

  it('should render empty prompt', () => {
    const { getByText } = render(
      <TogglePanel
        activeProducts={new Set()}
        finishedSteps={finishedSteps}
        activeSections={activeSections}
        expandedCardSteps={{} as ExpandedCardSteps}
        onCardClicked={jest.fn()}
        onStepClicked={onStepClicked}
        onStepButtonClicked={onStepButtonClicked}
      />
    );

    expect(getByText(`Hmm, there doesn't seem to be anything there`)).toBeInTheDocument();
    expect(
      getByText(`Switch on a toggle to continue your curated "Get Started" experience`)
    ).toBeInTheDocument();
  });

  it('should render sections', () => {
    const { getByTestId } = render(
      <TogglePanel
        activeProducts={activeProducts}
        finishedSteps={finishedSteps}
        activeSections={activeSections}
        expandedCardSteps={{} as ExpandedCardSteps}
        onCardClicked={jest.fn()}
        onStepClicked={onStepClicked}
        onStepButtonClicked={onStepButtonClicked}
      />
    );

    expect(getByTestId(`mock-sections`)).toBeInTheDocument();
  });
});
