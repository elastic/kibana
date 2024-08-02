/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect'; // for the 'toBeInTheDocument' matcher
import { SuggestionsSelect } from '../../../../shared/suggestions_select';
import { FiltersSection } from './filters_section';
import { Filter } from '../../../../../../common/custom_link/custom_link_types';
import { DEFAULT_OPTION } from './helper';
import { FILTER_OPTIONS } from '../../../../../../common/custom_link/custom_link_filter_options';

jest.mock('../../../../shared/suggestions_select', () => ({
  SuggestionsSelect: jest.fn(() => <div />),
}));

type SuggestionsSelectMock = jest.MockedFunction<typeof SuggestionsSelect>;

describe('FiltersSection', () => {
  it('should pass the correct fieldName prop to SuggestionsSelect', () => {
    const filters: Filter[] = [
      { key: '', value: '' },
      { key: FILTER_OPTIONS[0], value: '' },
    ];

    render(<FiltersSection filters={filters} onChangeFilters={() => {}} />);

    filters.forEach((filter, idx) => {
      const fieldName = filter.key !== '' ? filter.key : DEFAULT_OPTION.value;

      expect((SuggestionsSelect as SuggestionsSelectMock).mock.calls[idx][0]).toEqual(
        expect.objectContaining({
          fieldName,
        })
      );
    });
  });
});
