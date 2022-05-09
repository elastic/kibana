/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useQueryAlerts, ReturnQueryAlerts } from './use_query';
import * as api from './api';
import { mockAlertsQuery, alertsMock } from './mock';

jest.mock('./api');

describe('useQueryAlerts', () => {
  const indexName = 'mock-index-name';
  beforeEach(() => {
    jest.resetAllMocks();
  });
  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        [object, string],
        ReturnQueryAlerts<unknown, unknown>
      >(() => useQueryAlerts<unknown, unknown>({ query: mockAlertsQuery, indexName }));
      await waitForNextUpdate();
      expect(result.current).toEqual({
        loading: false,
        data: null,
        response: '',
        request: '',
        setQuery: result.current.setQuery,
        refetch: null,
      });
    });
  });

  test('fetch alerts data', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        [object, string],
        ReturnQueryAlerts<unknown, unknown>
      >(() => useQueryAlerts<unknown, unknown>({ query: mockAlertsQuery, indexName }));
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        loading: false,
        data: alertsMock,
        response: JSON.stringify(alertsMock, null, 2),
        request: JSON.stringify({ index: [indexName] ?? [''], body: mockAlertsQuery }, null, 2),
        setQuery: result.current.setQuery,
        refetch: result.current.refetch,
      });
    });
  });

  test('re-fetch alerts data', async () => {
    const spyOnfetchQueryAlerts = jest.spyOn(api, 'fetchQueryAlerts');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        [object, string],
        ReturnQueryAlerts<unknown, unknown>
      >(() => useQueryAlerts<unknown, unknown>({ query: mockAlertsQuery, indexName }));
      await waitForNextUpdate();
      await waitForNextUpdate();
      if (result.current.refetch) {
        result.current.refetch();
      }
      await waitForNextUpdate();
      expect(spyOnfetchQueryAlerts).toHaveBeenCalledTimes(2);
    });
  });

  test('fetch alert when index name changed', async () => {
    const spyOnfetchRules = jest.spyOn(api, 'fetchQueryAlerts');
    await act(async () => {
      const { rerender, waitForNextUpdate } = renderHook<
        [object, string],
        ReturnQueryAlerts<unknown, unknown>
      >((args) => useQueryAlerts({ query: args[0], indexName: args[1] }), {
        initialProps: [mockAlertsQuery, indexName],
      });
      await waitForNextUpdate();
      await waitForNextUpdate();
      rerender([mockAlertsQuery, 'new-mock-index-name']);
      await waitForNextUpdate();
      expect(spyOnfetchRules).toHaveBeenCalledTimes(2);
    });
  });

  test('fetch alert when query object changed', async () => {
    const spyOnfetchRules = jest.spyOn(api, 'fetchQueryAlerts');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        [object, string],
        ReturnQueryAlerts<unknown, unknown>
      >((args) => useQueryAlerts({ query: args[0], indexName: args[1] }), {
        initialProps: [mockAlertsQuery, indexName],
      });
      await waitForNextUpdate();
      await waitForNextUpdate();
      if (result.current.setQuery) {
        result.current.setQuery({ ...mockAlertsQuery });
      }
      await waitForNextUpdate();
      expect(spyOnfetchRules).toHaveBeenCalledTimes(2);
    });
  });

  test('if there is an error when fetching data, we should get back the init value for every properties', async () => {
    const spyOnGetUserPrivilege = jest.spyOn(api, 'fetchQueryAlerts');
    spyOnGetUserPrivilege.mockImplementation(() => {
      throw new Error('Something went wrong, let see what happen');
    });
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnQueryAlerts<unknown, unknown>>(
        () =>
          useQueryAlerts<unknown, unknown>({ query: mockAlertsQuery, indexName: 'mock-index-name' })
      );
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        loading: false,
        data: null,
        response: '',
        request: '',
        setQuery: result.current.setQuery,
        refetch: result.current.refetch,
      });
    });
  });

  test('skip', async () => {
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
    await act(async () => {
      const localProps = { query: mockAlertsQuery, indexName, skip: false };
      const { rerender, waitForNextUpdate } = renderHook<
        [object, string],
        ReturnQueryAlerts<unknown, unknown>
      >(() => useQueryAlerts<unknown, unknown>(localProps));
      await waitForNextUpdate();
      await waitForNextUpdate();

      localProps.skip = true;
      act(() => rerender());
      act(() => rerender());
      expect(abortSpy).toHaveBeenCalledTimes(2);
    });
  });
});
