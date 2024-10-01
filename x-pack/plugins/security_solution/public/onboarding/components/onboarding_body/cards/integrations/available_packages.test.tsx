/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { AvailablePackages } from './available_packages';
import { useAsyncRetry } from 'react-use';
import { fetchAvailablePackagesHook } from './utils';
import { TestProviders } from '../../../../../common/mock/test_providers';

jest.mock('react-use/lib/useAsyncRetry');
jest.mock('./utils', () => ({
  fetchAvailablePackagesHook: jest.fn(),
}));
jest.mock('./package_list_grid', () => ({
  PackageListGrid: jest.fn(() => <div data-test-subj="package-list-grid" />),
}));

describe('AvailablePackages', () => {
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

    const { getByTestId } = render(<AvailablePackages />, { wrapper: TestProviders });
    expect(getByTestId('loadingPackages')).toBeInTheDocument();
  });

  it('shows error callout when there is an error loading data', () => {
    (useAsyncRetry as jest.Mock).mockReturnValue({
      error: new Error('Loading error'),
      retry: mockRetry,
      loading: false,
    });

    const { getByTestId } = render(<AvailablePackages />, { wrapper: TestProviders });

    const retryButton = getByTestId('retryButton');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(mockRetry).toHaveBeenCalled();
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

    const { getByTestId } = render(<AvailablePackages />, { wrapper: TestProviders });

    await waitFor(() => {
      expect(getByTestId('package-list-grid')).toBeInTheDocument();
    });
  });
});
