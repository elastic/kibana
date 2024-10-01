/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { PackageListGrid } from './package_list_grid';
import {
  useStoredIntegrationSearchTerm,
  useStoredIntegrationTabId,
} from '../../../../hooks/use_stored_state';
import { useIntegrationCardList, useTabMetaData } from './hooks';
import { PackageList } from './utils';
import { DEFAULT_TAB } from './const';

jest.mock('../../../onboarding_context');
jest.mock('../../../../hooks/use_stored_state');
jest.mock('./hooks');
jest.mock('./utils', () => ({
  PackageList: jest.fn(() => <div data-test-subj="packageList" />),
}));

describe('PackageListGrid', () => {
  const mockUseAvailablePackages = jest.fn();
  const mockPackageList = PackageList as unknown as jest.Mock;
  const mockSetTabId = jest.fn();
  const mockSetCategory = jest.fn();
  const mockSetSelectedSubCategory = jest.fn();
  const mockSetSearchTerm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useStoredIntegrationTabId as jest.Mock).mockReturnValue([DEFAULT_TAB.id, jest.fn()]);
    (useStoredIntegrationSearchTerm as jest.Mock).mockReturnValue(['', jest.fn()]);
    (useTabMetaData as jest.Mock).mockReturnValue({
      showSearchTools: true,
      customCardNames: {},
      selectedCategory: 'security',
      selectedSubCategory: 'network',
    });
    (useIntegrationCardList as jest.Mock).mockReturnValue([]);
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

  it('renders the package list when data is available', () => {
    mockUseAvailablePackages.mockReturnValue({
      isLoading: false,
      filteredCards: [{ id: 'card1', name: 'Card 1' }],
      setCategory: mockSetCategory,
      setSelectedSubCategory: mockSetSelectedSubCategory,
      setSearchTerm: mockSetSearchTerm,
    });

    const { getByTestId } = render(
      <PackageListGrid useAvailablePackages={mockUseAvailablePackages} />
    );

    expect(getByTestId('packageList')).toBeInTheDocument();
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

    fireEvent.click(tabButton);
    expect(mockSetTabId).toHaveBeenCalledWith('user');
  });

  it('renders no search tools when showSearchTools is false', () => {
    (useTabMetaData as jest.Mock).mockReturnValue({
      showSearchTools: false,
      customCardNames: {},
      selectedCategory: 'category1',
      selectedSubCategory: 'subcategory1',
      overflow: 'auto',
    });

    mockUseAvailablePackages.mockReturnValue({
      isLoading: false,
      filteredCards: [],
      setCategory: mockSetCategory,
      setSelectedSubCategory: mockSetSelectedSubCategory,
      setSearchTerm: mockSetSearchTerm,
    });

    render(<PackageListGrid useAvailablePackages={mockUseAvailablePackages} />);

    expect(mockPackageList.mock.calls[0][0].showSearchTools).toEqual(false);
  });

  it('updates the search term when the search input changes', async () => {
    const mockSetSearchTermToStorage = jest.fn();
    (useStoredIntegrationSearchTerm as jest.Mock).mockReturnValue(['', mockSetSearchTermToStorage]);

    mockUseAvailablePackages.mockReturnValue({
      isLoading: false,
      filteredCards: [],
      setCategory: mockSetCategory,
      setSelectedSubCategory: mockSetSelectedSubCategory,
      setSearchTerm: mockSetSearchTerm,
      searchTerm: 'new search term',
    });

    render(<PackageListGrid useAvailablePackages={mockUseAvailablePackages} />);

    expect(mockPackageList.mock.calls[0][0].searchTerm).toEqual('new search term');
  });
});
