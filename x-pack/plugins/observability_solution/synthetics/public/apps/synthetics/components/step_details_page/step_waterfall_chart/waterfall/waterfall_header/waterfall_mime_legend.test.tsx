/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { fireEvent } from '@testing-library/react';
import 'jest-canvas-mock';
import { MIME_FILTERS, MimeType } from '../../../common/network_data/types';
import { WaterfallMimeLegend } from './waterfall_mime_legend';
import { render } from '../../../../../utils/testing';

describe('WaterfallMimeLegend', () => {
  jest.useFakeTimers();
  const activeFilters = [MimeType.XHR];
  const setActiveFilters = jest.fn();
  const setShowCustomMarks = jest.fn();
  const defaultProps = {
    activeFilters,
    setActiveFilters,
    showCustomMarks: false,
    setShowCustomMarks,
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText } = render(<WaterfallMimeLegend {...defaultProps} />);

    MIME_FILTERS.forEach((filter) => {
      expect(getByText(filter.label));
    });
  });

  it('filter icon changes state/appearance on active/inactive filters', () => {
    const Component = () => {
      const [activeFiltersTest, setActiveFiltersTest] = useState<string[]>([]);

      return (
        <WaterfallMimeLegend
          activeFilters={activeFiltersTest}
          setActiveFilters={setActiveFiltersTest}
          showCustomMarks={false}
          setShowCustomMarks={setShowCustomMarks}
        />
      );
    };
    const { getByText, queryByText } = render(<Component />);

    expect(getByText('Select an item to apply filter'));

    const xhrFilterItem = getByText('XHR').closest('[aria-checked]');
    const imageFilterItem = getByText('Image').closest('[aria-checked]');
    fireEvent.click(imageFilterItem);

    expect(imageFilterItem.getAttribute('aria-checked')).toBe('true');

    // toggle filters
    fireEvent.click(xhrFilterItem);
    fireEvent.click(imageFilterItem);

    expect(imageFilterItem.getAttribute('aria-checked')).toBe('false');

    expect(queryByText('Select an item to apply filter')).toBeNull();
  });

  it('resets all filters on clear filters', () => {
    const Component = () => {
      const [activeFiltersTest, setActiveFiltersTest] = useState<string[]>([]);

      return (
        <WaterfallMimeLegend
          activeFilters={activeFiltersTest}
          setActiveFilters={setActiveFiltersTest}
          showCustomMarks={false}
          setShowCustomMarks={setShowCustomMarks}
        />
      );
    };
    const { getByText, queryByText, getAllByRole } = render(<Component />);

    expect(getByText('Select an item to apply filter'));

    // "Clear filters" should only appear when at least one filter in set
    expect(queryByText('Clear filters')).toBeNull();

    const imageFilterItem = getByText('Image').closest('[aria-checked]');
    fireEvent.click(imageFilterItem);

    // Ensure at least one filter is selected
    expect(
      getAllByRole('checkbox').some((filter: HTMLDivElement) => filter.getAttribute('aria-checked'))
    ).toBeTruthy();

    expect(getByText('Clear filters'));

    expect(imageFilterItem.getAttribute('aria-checked')).toBe('true');

    // Clear all filters
    fireEvent.click(getByText('Clear filters'));

    // All filters should be checked because no filter means all filters are active
    expect(
      getAllByRole('checkbox').every((filter: HTMLDivElement) =>
        filter.getAttribute('aria-checked')
      )
    ).toBeTruthy();
  });
});
