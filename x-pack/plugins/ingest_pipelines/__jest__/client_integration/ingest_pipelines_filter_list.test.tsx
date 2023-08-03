/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { IntlProvider } from '@kbn/i18n-react';
import { act } from 'react-dom/test-utils';
import {
  FilterListButton,
  Filters,
  FilterName,
} from '../../public/application/sections/pipelines_list/main';

describe('FilterListButton', () => {
  const mockData = [
    { name: 'Pipeline 1', isManaged: true, processors: [] },
    { name: 'Pipeline 2', isManaged: false, processors: [] },
    { name: 'Pipeline 3', isManaged: true, processors: [] },
    { name: 'Pipeline 4', isManaged: false, processors: [] },
  ];

  const mockFilters: Filters<FilterName> = {
    managed: {
      name: 'Managed pipelines',
      checked: 'on',
      handleFilter: jest.fn((allPipelines) => allPipelines.filter((p) => p.isManaged)),
    },
    notManaged: {
      name: 'Not managed pipelines',
      checked: 'on',
      handleFilter: jest.fn((allPipelines) => allPipelines.filter((p) => !p.isManaged)),
    },
  };

  const setup = () => {
    const setFilters = jest.fn();
    const handleChange = jest.fn().mockImplementation((filters) => {
      setFilters(filters);
    });

    const { getByText } = render(
      <IntlProvider locale="en" messages={{}}>
        <FilterListButton filters={mockFilters} onChange={handleChange} />
      </IntlProvider>
    );

    const viewButton = getByText('View');
    act(() => {
      fireEvent.click(viewButton);
    });

    const notManagedFilter = getByText('Not managed pipelines');
    const managedFilter = getByText('Managed pipelines');

    return {
      setFilters,
      viewButton,
      notManagedFilter,
      managedFilter,
    };
  };

  it('should show only managed pipelines when only "Managed pipelines" filter is on', () => {
    const { setFilters, notManagedFilter } = setup();

    act(() => {
      fireEvent.click(notManagedFilter);
    });

    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({
        managed: expect.objectContaining({ checked: 'on', handleFilter: expect.any(Function) }),
        notManaged: expect.objectContaining({ checked: 'off', handleFilter: expect.any(Function) }),
      })
    );

    const filteredPipelines = mockFilters.managed.handleFilter?.(mockData);
    const onlyManagedPipelines = mockData.filter((pipeline) => pipeline.isManaged);

    expect(filteredPipelines).toEqual(onlyManagedPipelines);
  });

  it('should show only not managed pipelines when only "Not managed pipelines" filter is on', () => {
    const { setFilters, managedFilter } = setup();

    act(() => {
      fireEvent.click(managedFilter);
    });

    expect(setFilters).toHaveBeenCalledWith(
      expect.objectContaining({
        managed: expect.objectContaining({ checked: 'off', handleFilter: expect.any(Function) }),
        notManaged: expect.objectContaining({ checked: 'on', handleFilter: expect.any(Function) }),
      })
    );

    const filteredPipelines = mockFilters.notManaged.handleFilter?.(mockData);
    const onlyNotManagedPipelines = mockData.filter((pipeline) => !pipeline.isManaged);

    expect(filteredPipelines).toEqual(onlyNotManagedPipelines);
  });

  it('should show all pipelines when both "Not managed pipelines" and "Managed pipelines" filters are on', () => {
    const { managedFilter, notManagedFilter } = setup();

    act(() => {
      fireEvent.click(managedFilter);
      fireEvent.click(notManagedFilter);
    });

    const managedPipelines = mockFilters.managed.handleFilter?.(mockData);
    const notManagedPipelines = mockFilters.notManaged.handleFilter?.(mockData);

    const filteredPipelines = [...(managedPipelines ?? []), ...(notManagedPipelines ?? [])];

    const mockResult = [
      { name: 'Pipeline 1', isManaged: true, processors: [] },
      { name: 'Pipeline 3', isManaged: true, processors: [] },
      { name: 'Pipeline 2', isManaged: false, processors: [] },
      { name: 'Pipeline 4', isManaged: false, processors: [] },
    ];
    expect(filteredPipelines).toEqual(mockResult);
  });
});
