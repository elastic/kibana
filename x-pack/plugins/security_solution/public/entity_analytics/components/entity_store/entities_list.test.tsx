/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntitiesList } from './entities_list';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useQueryToggle } from '../../../common/containers/query_toggle';
import { useEntitiesListQuery } from './hooks/use_entities_list_query';
import { useErrorToast } from '../../../common/hooks/use_error_toast';
import type { ListEntitiesResponse } from '../../../../common/api/entity_analytics/entity_store/entities/list_entities.gen';
import { useGlobalFilterQuery } from '../../../common/hooks/use_global_filter_query';
import { TestProviders } from '../../../common/mock';

jest.mock('../../../common/containers/use_global_time');
jest.mock('../../../common/containers/query_toggle');
jest.mock('./hooks/use_entities_list_query');
jest.mock('../../../common/hooks/use_error_toast');
jest.mock('../../../common/hooks/use_global_filter_query');

const entityName = 'Entity Name';
const responseData: ListEntitiesResponse = {
  page: 1,
  per_page: 10,
  total: 1,
  records: [
    {
      '@timestamp': '2021-08-02T14:00:00.000Z',
      user: { name: entityName },
      entity: {
        name: entityName,
        source: 'test-index',
      },
    },
  ],
  inspect: undefined,
};

describe('EntitiesList', () => {
  const mockUseGlobalTime = useGlobalTime as jest.Mock;
  const mockUseQueryToggle = useQueryToggle as jest.Mock;
  const mockUseEntitiesListQuery = useEntitiesListQuery as jest.Mock;
  const mockUseErrorToast = useErrorToast as jest.Mock;
  const mockUseGlobalFilterQuery = useGlobalFilterQuery as jest.Mock;
  const mockRefech = jest.fn();

  beforeEach(() => {
    mockUseGlobalTime.mockReturnValue({
      deleteQuery: jest.fn(),
      setQuery: jest.fn(),
      isInitializing: false,
      from: 'now-15m',
      to: 'now',
    });

    mockUseQueryToggle.mockReturnValue({
      toggleStatus: true,
    });

    mockUseEntitiesListQuery.mockReturnValue({
      data: responseData,
      isLoading: false,
      isRefetching: false,
      refetch: mockRefech,
      error: null,
    });

    mockUseErrorToast.mockReturnValue(jest.fn());

    mockUseGlobalFilterQuery.mockReturnValue({ filterQuery: null });
  });

  it('renders the component', () => {
    const { getByText } = render(<EntitiesList />, { wrapper: TestProviders });
    expect(getByText(entityName)).toBeInTheDocument();
  });

  it('displays the correct number of rows', () => {
    render(<EntitiesList />, { wrapper: TestProviders });
    expect(screen.getAllByRole('row')).toHaveLength(2);
  });

  it('calls refetch on time range change', () => {
    const { rerender } = render(<EntitiesList />, { wrapper: TestProviders });
    mockUseGlobalTime.mockReturnValueOnce({
      deleteQuery: jest.fn(),
      setQuery: jest.fn(),
      isInitializing: false,
      from: 'now-30m',
      to: 'now',
    });
    mockRefech.mockClear();

    rerender(<EntitiesList />);

    expect(mockRefech).toHaveBeenCalled();
  });

  it('updates sorting when column header is clicked', () => {
    render(<EntitiesList />, { wrapper: TestProviders });
    const columnHeader = screen.getByText('Name');
    fireEvent.click(columnHeader);
    expect(mockUseEntitiesListQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        sortField: 'entity.name.text',
        sortOrder: 'asc',
      })
    );
  });

  it('displays error toast when there is an error', () => {
    const error = new Error('Test error');
    mockUseEntitiesListQuery.mockReturnValueOnce({
      data: null,
      isLoading: false,
      isRefetching: false,
      refetch: jest.fn(),
      error,
    });

    render(<EntitiesList />, { wrapper: TestProviders });
    expect(mockUseErrorToast).toHaveBeenCalledWith(
      'There was an error loading the entities list',
      error
    );
  });
});
