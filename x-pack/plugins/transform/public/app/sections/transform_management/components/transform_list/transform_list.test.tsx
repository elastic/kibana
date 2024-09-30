/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, type UseQueryResult } from '@tanstack/react-query';
import * as ReactQuery from '@tanstack/react-query';

import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { TransformList } from './transform_list';

const useQueryMock = jest.spyOn(ReactQuery, 'useQuery').mockImplementation((queryKey) => {
  switch (queryKey[0]) {
    case 'transform.data_view_exists':
      return { error: null, data: true } as UseQueryResult<unknown, unknown>;
  }

  return { error: null, data: undefined } as UseQueryResult<unknown, unknown>;
});

const queryClient = new QueryClient();

jest.mock('../../../../../shared_imports');
jest.mock('../../../../app_dependencies');

describe('Transform: Transform List <TransformList />', () => {
  test('Minimal initialization', async () => {
    const { container } = render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <TransformList
            isLoading={false}
            onCreateTransform={jest.fn()}
            transformNodes={1}
            transforms={[]}
            transformsLoading={false}
            transformsStatsLoading={false}
            pageState={{ pageSize: 10, pageIndex: 0, sortField: 'id', sortDirection: 'asc' }}
            updatePageState={jest.fn()}
          />
        </QueryClientProvider>
      </IntlProvider>
    );

    await waitFor(() => {
      expect(useQueryMock).toHaveBeenCalledTimes(5);
      expect(container.textContent).toContain('Create your first transform');
    });
  });
});
