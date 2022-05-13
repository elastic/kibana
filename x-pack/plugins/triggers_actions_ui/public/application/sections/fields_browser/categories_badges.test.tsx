/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../../mock';

import { CategoriesBadges } from './categories_badges';

const mockSetSelectedCategoryIds = jest.fn();
const defaultProps = {
  setSelectedCategoryIds: mockSetSelectedCategoryIds,
  selectedCategoryIds: [],
};

describe('CategoriesBadges', () => {
  beforeEach(() => {
    mockSetSelectedCategoryIds.mockClear();
  });

  it('should render empty badges', () => {
    const result = render(
      <TestProviders>
        <CategoriesBadges {...defaultProps} />
      </TestProviders>
    );

    const badges = result.getByTestId('category-badges');
    expect(badges).toBeInTheDocument();
    expect(badges.childNodes.length).toBe(0);
  });

  it('should render the selector button with selected categories', () => {
    const result = render(
      <TestProviders>
        <CategoriesBadges {...defaultProps} selectedCategoryIds={['base', 'event']} />
      </TestProviders>
    );

    const badges = result.getByTestId('category-badges');
    expect(badges.childNodes.length).toBe(2);
    expect(result.getByTestId('category-badge-base')).toBeInTheDocument();
    expect(result.getByTestId('category-badge-event')).toBeInTheDocument();
  });

  it('should call the set selected callback when badge unselect button clicked', () => {
    const result = render(
      <TestProviders>
        <CategoriesBadges {...defaultProps} selectedCategoryIds={['base', 'event']} />
      </TestProviders>
    );

    result.getByTestId('category-badge-unselect-base').click();
    expect(mockSetSelectedCategoryIds).toHaveBeenCalledWith(['event']);
  });
});
