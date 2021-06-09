/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { mockAppIndexPattern, mockIndexPattern, render } from '../rtl_helpers';
import { buildFilterLabel, FilterLabel } from './filter_label';
import * as useSeriesHook from '../hooks/use_series_filters';

describe('FilterLabel', function () {
  mockAppIndexPattern();

  const invertFilter = jest.fn();
  jest.spyOn(useSeriesHook, 'useSeriesFilters').mockReturnValue({
    invertFilter,
  } as any);

  it('should render properly', async function () {
    render(
      <FilterLabel
        field={'service.name'}
        value={'elastic-co'}
        label={'Web Application'}
        negate={false}
        seriesId={'kpi-trends'}
        removeFilter={jest.fn()}
      />
    );

    await waitFor(() => {
      screen.getByText('elastic-co');
      screen.getByText(/web application:/i);
      screen.getByTitle('Delete Web Application: elastic-co');
      screen.getByRole('button', {
        name: /delete web application: elastic-co/i,
      });
    });
  });

  it.skip('should delete filter', async function () {
    const removeFilter = jest.fn();
    render(
      <FilterLabel
        field={'service.name'}
        value={'elastic-co'}
        label={'Web Application'}
        negate={false}
        seriesId={'kpi-trends'}
        removeFilter={removeFilter}
      />
    );

    await waitFor(() => {
      fireEvent.click(screen.getByLabelText('Filter actions'));
    });

    fireEvent.click(screen.getByTestId('deleteFilter'));
    expect(removeFilter).toHaveBeenCalledTimes(1);
    expect(removeFilter).toHaveBeenCalledWith('service.name', 'elastic-co', false);
  });

  it.skip('should invert filter', async function () {
    const removeFilter = jest.fn();
    render(
      <FilterLabel
        field={'service.name'}
        value={'elastic-co'}
        label={'Web Application'}
        negate={false}
        seriesId={'kpi-trends'}
        removeFilter={removeFilter}
      />
    );

    await waitFor(() => {
      fireEvent.click(screen.getByLabelText('Filter actions'));
    });

    fireEvent.click(screen.getByTestId('negateFilter'));
    expect(invertFilter).toHaveBeenCalledTimes(1);
    expect(invertFilter).toHaveBeenCalledWith({
      field: 'service.name',
      negate: false,
      value: 'elastic-co',
    });
  });

  it('should display invert filter', async function () {
    render(
      <FilterLabel
        field={'service.name'}
        value={'elastic-co'}
        label={'Web Application'}
        negate={true}
        seriesId={'kpi-trends'}
        removeFilter={jest.fn()}
      />
    );

    await waitFor(() => {
      screen.getByText('elastic-co');
      screen.getByText(/web application:/i);
      screen.getByTitle('Delete NOT Web Application: elastic-co');
      screen.getByRole('button', {
        name: /delete not web application: elastic-co/i,
      });
    });
  });

  it('should build filter meta', function () {
    expect(
      buildFilterLabel({
        field: 'user_agent.name',
        label: 'Browser family',
        indexPattern: mockIndexPattern,
        value: 'Firefox',
        negate: false,
      })
    ).toEqual({
      meta: {
        alias: null,
        disabled: false,
        index: 'apm-*',
        key: 'Browser family',
        negate: false,
        type: 'phrase',
        value: 'Firefox',
      },
      query: {
        match_phrase: {
          'user_agent.name': 'Firefox',
        },
      },
    });
  });
});
