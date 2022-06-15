/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { mockBrowserFields, TestProviders } from '../../../../mock';

import { CategoriesSelector } from './categories_selector';

const mockSetSelectedCategoryIds = jest.fn();
const defaultProps = {
  filteredBrowserFields: mockBrowserFields,
  setSelectedCategoryIds: mockSetSelectedCategoryIds,
  selectedCategoryIds: [],
};

describe('CategoriesSelector', () => {
  beforeEach(() => {
    mockSetSelectedCategoryIds.mockClear();
  });

  it('should render the default selector button', () => {
    const categoriesCount = Object.keys(mockBrowserFields).length;
    const result = render(
      <TestProviders>
        <CategoriesSelector {...defaultProps} />
      </TestProviders>
    );

    expect(result.getByTestId('categories-filter-button')).toBeInTheDocument();
    expect(result.getByText('Categories')).toBeInTheDocument();
    expect(result.getByText(categoriesCount)).toBeInTheDocument();
  });

  it('should render the selector button with selected categories', () => {
    const result = render(
      <TestProviders>
        <CategoriesSelector {...defaultProps} selectedCategoryIds={['base', 'event']} />
      </TestProviders>
    );

    expect(result.getByTestId('categories-filter-button')).toBeInTheDocument();
    expect(result.getByText('Categories')).toBeInTheDocument();
    expect(result.getByText('2')).toBeInTheDocument();
  });

  it('should open the category selector', () => {
    const result = render(
      <TestProviders>
        <CategoriesSelector {...defaultProps} />
      </TestProviders>
    );

    result.getByTestId('categories-filter-button').click();

    expect(result.getByTestId('categories-selector-search')).toBeInTheDocument();
    expect(result.getByTestId(`categories-selector-option-base`)).toBeInTheDocument();
  });

  it('should open the category selector with selected categories', () => {
    const result = render(
      <TestProviders>
        <CategoriesSelector {...defaultProps} selectedCategoryIds={['base', 'event']} />
      </TestProviders>
    );

    result.getByTestId('categories-filter-button').click();

    expect(result.getByTestId('categories-selector-search')).toBeInTheDocument();
    expect(result.getByTestId(`categories-selector-option-base`)).toBeInTheDocument();
    expect(result.getByTestId(`categories-selector-option-name-base`)).toHaveStyleRule(
      'font-weight',
      'bold'
    );
  });

  it('should call setSelectedCategoryIds when category selected', () => {
    const result = render(
      <TestProviders>
        <CategoriesSelector {...defaultProps} />
      </TestProviders>
    );

    result.getByTestId('categories-filter-button').click();
    result.getByTestId(`categories-selector-option-base`).click();
    expect(mockSetSelectedCategoryIds).toHaveBeenCalledWith(['base']);
  });
});
