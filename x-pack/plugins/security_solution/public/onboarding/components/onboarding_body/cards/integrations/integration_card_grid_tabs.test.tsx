/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { IntegrationsCardGridTabs } from './integration_card_grid_tabs';
import { useAsyncRetry } from 'react-use';
import { fetchAvailablePackagesHook } from './utils';
import { TestProviders } from '../../../../../common/mock/test_providers';

jest.mock('react-use/lib/useAsyncRetry');
jest.mock('./utils', () => ({
  fetchAvailablePackagesHook: jest.fn(),
}));
jest.mock('./package_list_grid');

describe('IntegrationsCardGridTabs', () => {
  const mockRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading skeleton while fetching data', () => {
    (useAsyncRetry as jest.Mock).mockReturnValue({
      error: null,
      retry: mockRetry,
      loading: true,
    });

    const { getByTestId } = render(<IntegrationsCardGridTabs />, { wrapper: TestProviders });
    expect(getByTestId('loadingPackages')).toBeInTheDocument();
  });

  it('renders PackageListGrid when data is loaded successfully', async () => {
    const mockAvailablePackages = jest.fn();
    (fetchAvailablePackagesHook as jest.Mock).mockResolvedValue(mockAvailablePackages);

    (useAsyncRetry as jest.Mock).mockImplementation(async (cb) => {
      await cb();
      return {
        error: null,
        retry: mockRetry,
        loading: false,
      };
    });

    const { getByTestId } = render(<IntegrationsCardGridTabs />, { wrapper: TestProviders });

    await waitFor(() => {
      expect(getByTestId('packageListGrid')).toBeInTheDocument();
    });
  });
});
