/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { TogglePanel } from './toggle_panel';
import { useSetUpSections } from './hooks/use_setup_cards';
import { QuickStart } from './types';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: jest.fn(() => ({ euiTheme: { base: 16, size: { xs: '4px' } } })),
  useEuiShadow: jest.fn(),
}));

jest.mock('./hooks/use_setup_cards', () => ({
  useSetUpSections: jest.fn(),
}));

describe('TogglePanel', () => {
  const mockUseSetUpCardSections = {
    setUpSections: jest.fn(() => <div data-test-subj="mock-sections" />),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useSetUpSections as jest.Mock).mockReturnValue(mockUseSetUpCardSections);
  });

  it('should render sections', () => {
    const finishedCards = new Set([QuickStart.createFirstProject]);
    const { getByTestId } = render(<TogglePanel finishedCards={finishedCards} />);

    expect(getByTestId(`mock-sections`)).toBeInTheDocument();
  });
});
