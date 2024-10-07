/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { PackageListGrid } from './package_list_grid';
import {
  useStoredIntegrationSearchTerm,
  useStoredIntegrationTabId,
} from '../../../../hooks/use_stored_state';
import * as module from '@kbn/fleet-plugin/public';
import { DEFAULT_TAB } from './constants';

jest.mock('../../../onboarding_context');
jest.mock('../../../../hooks/use_stored_state');

jest.mock('../../../../../common/lib/kibana', () => ({
  useNavigation: jest.fn().mockReturnValue({
    navigateTo: jest.fn(),
    getAppUrl: jest.fn(),
  }),
}));

const mockPackageList = jest.fn().mockReturnValue(<div data-test-subj="packageList" />);

jest
  .spyOn(module, 'PackageList')
  .mockImplementation(() => Promise.resolve({ PackageListGrid: mockPackageList }));

describe('PackageListGrid', () => {
  const mockUseAvailablePackages = jest.fn();
  const mockSetTabId = jest.fn();
  const mockSetCategory = jest.fn();
  const mockSetSelectedSubCategory = jest.fn();
  const mockSetSearchTerm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useStoredIntegrationTabId as jest.Mock).mockReturnValue([DEFAULT_TAB.id, jest.fn()]);
    (useStoredIntegrationSearchTerm as jest.Mock).mockReturnValue(['', jest.fn()]);
  });

  it('renders loading skeleton when data is loading', () => {
    mockUseAvailablePackages.mockReturnValue({
      isLoading: true,
      filteredCards: [],
      setCategory: mockSetCategory,
      setSelectedSubCategory: mockSetSelectedSubCategory,
      setSearchTerm: mockSetSearchTerm,
    });

    const { getByTestId } = render(
      <PackageListGrid useAvailablePackages={mockUseAvailablePackages} />
    );

    expect(getByTestId('loadingPackages')).toBeInTheDocument();
  });

  it('renders the package list when data is available', async () => {
    mockUseAvailablePackages.mockReturnValue({
      isLoading: false,
      filteredCards: [{ id: 'card1', name: 'Card 1', url: 'https://mock-url' }],
      setCategory: mockSetCategory,
      setSelectedSubCategory: mockSetSelectedSubCategory,
      setSearchTerm: mockSetSearchTerm,
    });

    const { getByTestId } = render(
      <PackageListGrid useAvailablePackages={mockUseAvailablePackages} />
    );

    await waitFor(() => {
      expect(getByTestId('packageList')).toBeInTheDocument();
    });
  });

  it('saves the selected tab to storage', () => {
    (useStoredIntegrationTabId as jest.Mock).mockReturnValue(['recommended', mockSetTabId]);

    mockUseAvailablePackages.mockReturnValue({
      isLoading: false,
      filteredCards: [],
      setCategory: mockSetCategory,
      setSelectedSubCategory: mockSetSelectedSubCategory,
      setSearchTerm: mockSetSearchTerm,
    });

    const { getByTestId } = render(
      <PackageListGrid useAvailablePackages={mockUseAvailablePackages} />
    );

    const tabButton = getByTestId('user');

    act(() => {
      fireEvent.click(tabButton);
    });
    expect(mockSetTabId).toHaveBeenCalledWith('user');
  });

  it('renders no search tools when showSearchTools is false', async () => {
    mockUseAvailablePackages.mockReturnValue({
      isLoading: false,
      filteredCards: [],
      setCategory: mockSetCategory,
      setSelectedSubCategory: mockSetSelectedSubCategory,
      setSearchTerm: mockSetSearchTerm,
    });

    render(<PackageListGrid useAvailablePackages={mockUseAvailablePackages} />);

    await waitFor(() => {
      expect(mockPackageList.mock.calls[0][0].showSearchTools).toEqual(false);
    });
  });

  it('updates the search term when the search input changes', async () => {
    const mockSetSearchTermToStorage = jest.fn();
    (useStoredIntegrationSearchTerm as jest.Mock).mockReturnValue([
      'new search term',
      mockSetSearchTermToStorage,
    ]);

    mockUseAvailablePackages.mockReturnValue({
      isLoading: false,
      filteredCards: [],
      setCategory: mockSetCategory,
      setSelectedSubCategory: mockSetSelectedSubCategory,
      setSearchTerm: mockSetSearchTerm,
      searchTerm: 'new search term',
    });

    render(<PackageListGrid useAvailablePackages={mockUseAvailablePackages} />);

    await waitFor(() => {
      expect(mockPackageList.mock.calls[0][0].searchTerm).toEqual('new search term');
    });
  });
});
