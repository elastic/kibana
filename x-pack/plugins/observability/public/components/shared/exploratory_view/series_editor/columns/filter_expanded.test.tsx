/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { FilterExpanded } from './filter_expanded';
import { mockAppIndexPattern, mockUseValuesList, render } from '../../rtl_helpers';
import { USER_AGENT_NAME } from '../../configurations/constants/elasticsearch_fieldnames';

describe('FilterExpanded', function () {
  it('should render properly', async function () {
    const initSeries = { filters: [{ field: USER_AGENT_NAME, values: ['Chrome'] }] };
    mockAppIndexPattern();

    render(
      <FilterExpanded
        seriesId={'series-id'}
        label={'Browser Family'}
        field={USER_AGENT_NAME}
        goBack={jest.fn()}
      />,
      { initSeries }
    );

    screen.getByText('Browser Family');
  });
  it('should call go back on click', async function () {
    const initSeries = { filters: [{ field: USER_AGENT_NAME, values: ['Chrome'] }] };
    const goBack = jest.fn();

    render(
      <FilterExpanded
        seriesId={'series-id'}
        label={'Browser Family'}
        field={USER_AGENT_NAME}
        goBack={goBack}
      />,
      { initSeries }
    );

    fireEvent.click(screen.getByText('Browser Family'));

    expect(goBack).toHaveBeenCalledTimes(1);
    expect(goBack).toHaveBeenCalledWith();
  });

  it('should call useValuesList on load', async function () {
    const initSeries = { filters: [{ field: USER_AGENT_NAME, values: ['Chrome'] }] };

    const { spy } = mockUseValuesList(['Chrome', 'Firefox']);

    const goBack = jest.fn();

    render(
      <FilterExpanded
        seriesId={'series-id'}
        label={'Browser Family'}
        field={USER_AGENT_NAME}
        goBack={goBack}
      />,
      { initSeries }
    );

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toBeCalledWith(
      expect.objectContaining({
        time: { from: 'now-15m', to: 'now' },
        sourceField: USER_AGENT_NAME,
      })
    );
  });
  it('should filter display values', async function () {
    const initSeries = { filters: [{ field: USER_AGENT_NAME, values: ['Chrome'] }] };

    mockUseValuesList(['Chrome', 'Firefox']);

    render(
      <FilterExpanded
        seriesId={'series-id'}
        label={'Browser Family'}
        field={USER_AGENT_NAME}
        goBack={jest.fn()}
      />,
      { initSeries }
    );

    expect(screen.queryByText('Firefox')).toBeTruthy();

    fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'ch' } });

    expect(screen.queryByText('Firefox')).toBeFalsy();
    expect(screen.getByText('Chrome')).toBeTruthy();
  });
});
