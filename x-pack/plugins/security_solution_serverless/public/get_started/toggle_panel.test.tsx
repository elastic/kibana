/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { TogglePanel } from './toggle_panel';
import { useSetUpCardSections } from './use_setup_cards';
import type { ActiveCards, CardId, StepId } from './types';
import { GetSetUpCardId, IntroductionSteps, SectionId } from './types';
import { ProductLine } from '../../common/product';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: jest.fn(() => ({ euiTheme: { base: 16, size: { xs: '4px' } } })),
  useEuiShadow: jest.fn(),
}));

jest.mock('./use_setup_cards', () => ({
  useSetUpCardSections: jest.fn(),
}));

const finishedSteps = {
  [GetSetUpCardId.introduction]: new Set([IntroductionSteps.watchOverviewVideo]),
} as unknown as Record<CardId, Set<StepId>>;
const activeProducts = new Set([ProductLine.security, ProductLine.cloud]);

const activeCards = {
  [SectionId.getSetUp]: {
    [GetSetUpCardId.introduction]: {
      id: GetSetUpCardId.introduction,
      timeInMins: 3,
      stepsLeft: 1,
    },
    [GetSetUpCardId.bringInYourData]: {
      id: GetSetUpCardId.bringInYourData,
      timeInMins: 0,
      stepsLeft: 0,
    },
    [GetSetUpCardId.activateAndCreateRules]: {
      id: GetSetUpCardId.activateAndCreateRules,
      timeInMins: 0,
      stepsLeft: 0,
    },
    [GetSetUpCardId.protectYourEnvironmentInRealtime]: {
      id: GetSetUpCardId.protectYourEnvironmentInRealtime,
      timeInMins: 0,
      stepsLeft: 0,
    },
  },
} as ActiveCards;

describe('TogglePanel', () => {
  const mockUseSetUpCardSections = {
    setUpSections: jest.fn(() => <div data-test-subj="mock-sections" />),
  };

  const onStepClicked = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();

    (useSetUpCardSections as jest.Mock).mockReturnValue(mockUseSetUpCardSections);
  });

  it('should render empty prompt', () => {
    const { getByText } = render(
      <TogglePanel
        activeProducts={new Set()}
        finishedSteps={finishedSteps}
        activeCards={activeCards}
        onStepClicked={onStepClicked}
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
        activeCards={activeCards}
        onStepClicked={onStepClicked}
      />
    );

    expect(getByTestId(`mock-sections`)).toBeInTheDocument();
  });
});
