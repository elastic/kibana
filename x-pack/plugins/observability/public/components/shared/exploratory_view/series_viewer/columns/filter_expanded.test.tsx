/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { USER_AGENT_NAME } from '../../configurations/constants/elasticsearch_fieldnames';
import { mockAppIndexPattern, mockUseValuesList, mockUxSeries, render } from '../../rtl_helpers';
import { FilterExpanded } from './filter_expanded';

describe('FilterExpanded', function () {
  const filters = [{ field: USER_AGENT_NAME, values: ['Chrome'] }];

  const mockSeries = { ...mockUxSeries, filters };

  it('renders', async function () {
    const initSeries = { filters };
    mockAppIndexPattern();

    render(
      <FilterExpanded
        seriesId={0}
        series={mockSeries}
        label={'Browser Family'}
        field={USER_AGENT_NAME}
        filters={[]}
      />,
      { initSeries }
    );

    await waitFor(() => {
      expect(screen.getByText('Browser Family')).toBeInTheDocument();
    });
  });

  it('calls goBack on click', async () => {
    const goBack = jest.fn();
    const initSeries = { filters };

    render(
      <FilterExpanded
        seriesId={0}
        series={mockSeries}
        label={'Browser Family'}
        field={USER_AGENT_NAME}
        filters={[]}
      />,
      { initSeries }
    );

    fireEvent.click(screen.getByText('Browser Family'));

    await waitFor(() => {
      expect(goBack).toHaveBeenCalledTimes(1);
      expect(goBack).toHaveBeenCalledWith();
    });
  });

  it('calls useValuesList on load', async () => {
    const initSeries = { filters };

    const { spy } = mockUseValuesList([
      { label: 'Chrome', count: 10 },
      { label: 'Firefox', count: 5 },
    ]);

    render(
      <FilterExpanded
        seriesId={0}
        series={mockSeries}
        label={'Browser Family'}
        field={USER_AGENT_NAME}
        filters={[]}
      />,
      { initSeries }
    );

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toBeCalledWith(
        expect.objectContaining({
          time: { from: 'now-15m', to: 'now' },
          sourceField: USER_AGENT_NAME,
        })
      );
    });
  });

  it('should filter display values', async function () {
    const initSeries = { filters };

    mockUseValuesList([
      { label: 'Chrome', count: 10 },
      { label: 'Firefox', count: 5 },
    ]);

    render(
      <FilterExpanded
        seriesId={0}
        series={mockUxSeries}
        label={'Browser Family'}
        field={USER_AGENT_NAME}
        filters={[]}
      />,
      { initSeries }
    );

    fireEvent.click(screen.getByText('Browser Family'));

    expect(screen.queryByText('Firefox')).toBeTruthy();

    fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'ch' } });

    expect(screen.queryByText('Firefox')).toBeFalsy();
    expect(screen.getByText('Chrome')).toBeTruthy();
  });
});
