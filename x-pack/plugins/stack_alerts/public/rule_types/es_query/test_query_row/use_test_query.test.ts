/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { act } from 'react-test-renderer';
import { useTestQuery } from './use_test_query';

describe('useTestQuery', () => {
  test('returning a valid result for ungrouped result', async () => {
    const { result } = renderHook(useTestQuery, {
      initialProps: () =>
        Promise.resolve({
          testResults: {
            results: [{ group: 'all documents', hits: [], count: 1, sourceFields: [] }],
            truncated: false,
          },
          isGrouped: false,
          timeWindow: '1s',
          rawResults: {
            cols: [{ id: 'ungrouped', name: 'ungrouped', field: 'ungrouped', actions: false }],
            rows: [{ ungrouped: 'test' }],
          },
        }),
    });
    await act(async () => {
      await result.current.onTestQuery();
    });
    expect(result.current.testQueryLoading).toBe(false);
    expect(result.current.testQueryError).toBe(null);
    expect(result.current.testQueryResult).toContain('1s');
    expect(result.current.testQueryResult).toContain('1 document');
    expect(result.current.testQueryRawResults).toEqual({
      cols: [{ id: 'ungrouped', name: 'ungrouped', field: 'ungrouped', actions: false }],
      rows: [{ ungrouped: 'test' }],
    });
    expect(result.current.testQueryAlerts).toEqual(['query matched']);
  });

  test('returning a valid result for grouped result', async () => {
    const { result } = renderHook(useTestQuery, {
      initialProps: () =>
        Promise.resolve({
          testResults: {
            results: [
              { group: 'a', count: 1, value: 10, hits: [], sourceFields: [] },
              { group: 'b', count: 2, value: 20, hits: [], sourceFields: [] },
            ],
            truncated: false,
          },
          isGrouped: true,
          timeWindow: '1s',
          rawResults: {
            cols: [{ id: 'grouped', name: 'grouped', field: 'grouped', actions: false }],
            rows: [{ grouped: 'test' }],
          },
        }),
    });
    await act(async () => {
      await result.current.onTestQuery();
    });
    expect(result.current.testQueryLoading).toBe(false);
    expect(result.current.testQueryError).toBe(null);
    expect(result.current.testQueryResult).toContain('1s');
    expect(result.current.testQueryResult).toContain(
      'Grouped query matched 2 groups in the last 1s.'
    );
    expect(result.current.testQueryRawResults).toEqual({
      cols: [{ id: 'grouped', name: 'grouped', field: 'grouped', actions: false }],
      rows: [{ grouped: 'test' }],
    });
    expect(result.current.testQueryAlerts).toEqual(['a', 'b']);
  });

  test('returning an error', async () => {
    const errorMsg = 'How dare you writing such a query';
    const { result } = renderHook(useTestQuery, {
      initialProps: () => Promise.reject({ message: errorMsg }),
    });
    await act(async () => {
      await result.current.onTestQuery();
    });
    expect(result.current.testQueryLoading).toBe(false);
    expect(result.current.testQueryError).toContain(errorMsg);
    expect(result.current.testQueryResult).toBe(null);
    expect(result.current.testQueryRawResults).toBe(null);
    expect(result.current.testQueryAlerts).toBe(null);
  });
});
