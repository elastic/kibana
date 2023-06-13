/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { TogglePanel } from './toggle_panel';
import { getStartedStorage as mockGetStartedStorage } from '../../lib/get_started/storage';
import { useSetUpCardSections } from './use_setup_cards';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: jest.fn(() => ({ euiTheme: { base: 16, size: { xs: '4px' } } })),
  useEuiShadow: jest.fn(),
}));

jest.mock('../../services', () => ({
  useKibana: jest.fn(() => ({
    services: {
      storage: {},
    },
  })),
}));

jest.mock('../../lib/get_started/storage');

jest.mock('./use_setup_cards', () => ({
  useSetUpCardSections: jest.fn(),
}));

describe('TogglePanel', () => {
  const mockUseSetUpCardSections = { setUpSections: jest.fn(() => null) };

  beforeEach(() => {
    jest.clearAllMocks();

    (useSetUpCardSections as jest.Mock).mockReturnValue(mockUseSetUpCardSections);
  });

  it('should render the product switch ', () => {
    const { getByTestId } = render(<TogglePanel />);

    expect(getByTestId('product-switch')).toBeInTheDocument();
  });

  it('should render empty prompt', () => {
    const { getByText } = render(<TogglePanel />);

    expect(getByText(`Hmm, there doesn't seem to be anything there`)).toBeInTheDocument();
    expect(
      getByText(`Switch on a toggle to continue your curated "Get Started" experience`)
    ).toBeInTheDocument();
  });

  it('should toggle active sections when a product switch is changed', () => {
    const { getByText } = render(<TogglePanel />);

    const analyticsSwitch = getByText('Analytics');
    const cloudSwitch = getByText('Cloud');

    fireEvent.click(analyticsSwitch);
    expect(mockGetStartedStorage.toggleActiveProductsInStorage).toHaveBeenCalledWith('analytics');

    fireEvent.click(cloudSwitch);
    expect(mockGetStartedStorage.toggleActiveProductsInStorage).toHaveBeenCalledWith('cloud');
  });
});
