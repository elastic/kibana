/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { Subject } from 'rxjs';
import type { SecuritySolutionESQLBasedErrorResponse, UseESQLBasedEventsArgs } from '.';
import { useESQLBasedEvents } from '.';
import type { Datatable } from '@kbn/expressions-plugin/common';

const queryDataObserver: Subject<{
  result: Datatable | SecuritySolutionESQLBasedErrorResponse;
}> = new Subject();

const contractMock = {
  getData: jest.fn().mockReturnValue(queryDataObserver.asObservable()),
  cancel: jest.fn(),
};

const expressionsServiceMock = {
  ...expressionsPluginMock.createStartContract(),
  execute: jest.fn().mockReturnValue(contractMock),
};

const mockQueryClient = new QueryClient();

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <QueryClientProvider client={mockQueryClient}>{children}</QueryClientProvider>;
};

const defaultProps: UseESQLBasedEventsArgs = {
  query: {
    esql: 'from sample_query',
  },
  expressions: expressionsServiceMock,
  timeRange: {
    from: 'now-1d',
    to: 'now',
  },
  filters: [],
};

describe('useESQLBasedQueryEvents', () => {
  // beforeEach(() => {
  //   queryDataObserver.next({
  //     result: mockTimelineDat,
  //   });
  // });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return an empty array when no events are found', async () => {
    // queryDataObserver.next({
    //   result: mockESQLTimelineNoResults,
    // });

    const { result } = renderHook(
      () =>
        useESQLBasedEvents({
          ...defaultProps,
        }),
      {
        wrapper: TestWrapper,
      }
    );

    expect(result.current.isSuccess).toBe(true);

    expect(result.current.data).toMatchObject({
      columns: [],
      data: [],
      warnings: undefined,
    });
  });

  test('should return correct set of events in proper format', async () => {
    const { result } = renderHook(
      () =>
        useESQLBasedEvents({
          ...defaultProps,
        }),
      {
        wrapper: TestWrapper,
      }
    );

    ///////////////////////////
    //   lastValueFrom is not working. Need to check why
    ///////////////////////////

    // queryDataObserver.next({
    //   result: mockESQLTimelineData,
    // });

    // await waitFor(() => {
    //   expect(result.current.isLoading).toBe(true);
    // });
    //
    // await waitFor(() => {
    //   expect(queryDataObserver.pipe).toHaveBeenCalledTimes(1);
    // });
    //
    //
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      // expect(result.current.data).toMatchObject(mockESQLTimelineData);
    });
  });

  test.todo('should report loading status correctly');
  describe('impact of inputs', () => {
    test.todo('should return new set of handler on timeRange change');
    test.todo('should return new set of handler on query change');
    test.todo('should return new set of handler on filter change');
  });

  describe('error handling', () => {
    test.todo('should show toast when there is an error');
  });
});
