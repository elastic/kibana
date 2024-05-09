/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { TogglePanel } from './toggle_panel';
import { useSetUpSections } from './hooks/use_setup_sections';
import type { ActiveSections } from './types';
import { QuickStartSectionCardsId, SectionId } from './types';
import { ProductLine } from './configs';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: jest.fn(() => ({ euiTheme: { base: 16, size: { xs: '4px' } } })),
  useEuiShadow: jest.fn(),
}));

jest.mock('./hooks/use_setup_sections', () => ({ useSetUpSections: jest.fn() }));
jest.mock('./context/step_context');

describe('TogglePanel', () => {
  const mockUseSetUpCardSections = {
    setUpSections: jest.fn(() => <div data-test-subj="mock-sections" />),
  };

  const activeProducts = new Set([ProductLine.security, ProductLine.cloud]);

  const activeSections = {
    [SectionId.quickStart]: {
      [QuickStartSectionCardsId.createFirstProject]: {
        id: QuickStartSectionCardsId.createFirstProject,
        timeInMins: 3,
        stepsLeft: 1,
      },
      [QuickStartSectionCardsId.watchTheOverviewVideo]: {
        id: QuickStartSectionCardsId.watchTheOverviewVideo,
        timeInMins: 0,
        stepsLeft: 0,
      },
    },
  } as ActiveSections;

  beforeEach(() => {
    jest.clearAllMocks();

    (useSetUpSections as jest.Mock).mockReturnValue(mockUseSetUpCardSections);
  });

  it('should render empty prompt', () => {
    const { getByText } = render(
      <TogglePanel activeProducts={new Set()} activeSections={activeSections} />
    );

    expect(getByText(`Hmm, there doesn't seem to be anything there`)).toBeInTheDocument();
    expect(
      getByText(`Switch on a toggle to continue your curated "Get Started" experience`)
    ).toBeInTheDocument();
  });

  it('should render sections', () => {
    const { getByTestId } = render(
      <TogglePanel activeProducts={activeProducts} activeSections={activeSections} />
    );

    expect(getByTestId(`mock-sections`)).toBeInTheDocument();
  });
});
