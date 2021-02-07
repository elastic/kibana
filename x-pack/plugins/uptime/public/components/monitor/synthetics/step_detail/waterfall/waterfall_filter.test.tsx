/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { act, fireEvent } from '@testing-library/react';

import { render } from '../../../../../lib/helper/rtl_helpers';

import 'jest-canvas-mock';
import { MIME_FILTERS, WaterfallFilter } from './waterfall_filter';
import {
  FILTER_REQUESTS_LABEL,
  FILTER_POPOVER_OPEN_LABEL,
} from '../../waterfall/components/translations';

describe('waterfall filter', () => {
  jest.useFakeTimers();

  it('renders correctly', () => {
    const { getByLabelText, getByTitle } = render(
      <WaterfallFilter
        query={''}
        setQuery={jest.fn()}
        activeFilters={[]}
        onlyHighlighted={false}
        setActiveFilters={jest.fn()}
        setOnlyHighlighted={jest.fn()}
      />
    );

    fireEvent.click(getByLabelText(FILTER_POPOVER_OPEN_LABEL));

    MIME_FILTERS.forEach((filter) => {
      expect(getByTitle(filter.label));
    });
  });

  it('filter icon changes color on active/inactive filters', () => {
    const Component = () => {
      const [activeFilters, setActiveFilters] = useState<string[]>([]);

      return (
        <WaterfallFilter
          query={''}
          setQuery={jest.fn()}
          activeFilters={activeFilters}
          onlyHighlighted={false}
          setActiveFilters={setActiveFilters}
          setOnlyHighlighted={jest.fn()}
        />
      );
    };
    const { getByLabelText, getByTitle } = render(<Component />);

    fireEvent.click(getByLabelText(FILTER_POPOVER_OPEN_LABEL));

    fireEvent.click(getByTitle('XHR'));

    expect(getByLabelText(FILTER_POPOVER_OPEN_LABEL)).toHaveAttribute(
      'class',
      'euiButtonIcon euiButtonIcon--primary'
    );

    // toggle it back to inactive
    fireEvent.click(getByTitle('XHR'));

    expect(getByLabelText(FILTER_POPOVER_OPEN_LABEL)).toHaveAttribute(
      'class',
      'euiButtonIcon euiButtonIcon--text'
    );
  });

  it('search input is working properly', () => {
    const setQuery = jest.fn();

    const Component = () => {
      return (
        <WaterfallFilter
          query={''}
          setQuery={setQuery}
          activeFilters={[]}
          onlyHighlighted={false}
          setActiveFilters={jest.fn()}
          setOnlyHighlighted={jest.fn()}
        />
      );
    };
    const { getByLabelText } = render(<Component />);

    const testText = 'js';

    fireEvent.change(getByLabelText(FILTER_REQUESTS_LABEL), { target: { value: testText } });

    // inout has debounce effect so hence the timer
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(setQuery).toHaveBeenCalledWith(testText);
  });
});
