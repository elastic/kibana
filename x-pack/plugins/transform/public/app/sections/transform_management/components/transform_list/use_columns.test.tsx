/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

import { useColumns } from './use_columns';

jest.mock('../../../../../shared_imports');
jest.mock('../../../../app_dependencies');

describe('Transform: Job List Columns', () => {
  test('useColumns()', async () => {
    const queryClient = new QueryClient();
    const wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useColumns([], () => {}, 1, [], false), {
      wrapper,
    });

    await waitFor(() => null);

    const columns: ReturnType<typeof useColumns>['columns'] = result.current.columns;

    expect(columns).toHaveLength(10);
    expect(columns[0].isExpander).toBeTruthy();
    expect(columns[1].name).toBe('ID');
    expect(columns[2].id).toBe('alertRule');
    expect(columns[3].name).toBe('Description');
    expect(columns[4].name).toBe('Type');
    expect(columns[5].name).toBe('Status');
    expect(columns[6].name).toBe('Mode');
    expect(columns[7].name).toBe('Progress');
    expect(columns[8].name).toBe('Health');
    expect(columns[9].name).toBe('Actions');
  });
});
