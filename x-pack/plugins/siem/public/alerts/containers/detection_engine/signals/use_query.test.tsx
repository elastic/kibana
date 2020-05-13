/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useQuerySignals, ReturnQuerySignals } from './use_query';
import * as api from './api';
import { mockSignalsQuery, signalsMock } from './mock';

jest.mock('./api');

describe('useQuerySignals', () => {
  const indexName = 'mock-index-name';
  beforeEach(() => {
    jest.resetAllMocks();
  });
  test('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        [object, string],
        ReturnQuerySignals<unknown, unknown>
      >(() => useQuerySignals<unknown, unknown>(mockSignalsQuery, indexName));
      await waitForNextUpdate();
      expect(result.current).toEqual({
        loading: true,
        data: null,
        response: '',
        request: '',
        setQuery: result.current.setQuery,
        refetch: null,
      });
    });
  });

  test('fetch signals data', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        [object, string],
        ReturnQuerySignals<unknown, unknown>
      >(() => useQuerySignals<unknown, unknown>(mockSignalsQuery, indexName));
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual({
        loading: false,
        data: signalsMock,
        response: JSON.stringify(signalsMock, null, 2),
        request: JSON.stringify({ index: [indexName] ?? [''], body: mockSignalsQuery }, null, 2),
        setQuery: result.current.setQuery,
        refetch: result.current.refetch,
      });
    });
  });

  test('re-fetch signals data', async () => {
    const spyOnfetchQuerySignals = jest.spyOn(api, 'fetchQuerySignals');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        [object, string],
        ReturnQuerySignals<unknown, unknown>
      >(() => useQuerySignals<unknown, unknown>(mockSignalsQuery, indexName));
      await waitForNextUpdate();
      await waitForNextUpdate();
      if (result.current.refetch) {
        result.current.refetch();
      }
      await waitForNextUpdate();
      expect(spyOnfetchQuerySignals).toHaveBeenCalledTimes(2);
    });
  });

  test('fetch signal when index name changed', async () => {
    const spyOnfetchRules = jest.spyOn(api, 'fetchQuerySignals');
    await act(async () => {
      const { rerender, waitForNextUpdate } = renderHook<
        [object, string],
        ReturnQuerySignals<unknown, unknown>
      >(args => useQuerySignals(args[0], args[1]), {
        initialProps: [mockSignalsQuery, indexName],
      });
      await waitForNextUpdate();
      await waitForNextUpdate();
      rerender([mockSignalsQuery, 'new-mock-index-name']);
      await waitForNextUpdate();
      expect(spyOnfetchRules).toHaveBeenCalledTimes(2);
    });
  });

  test('fetch signal when query object changed', async () => {
    const spyOnfetchRules = jest.spyOn(api, 'fetchQuerySignals');
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        [object, string],
        ReturnQuerySignals<unknown, unknown>
      >(args => useQuerySignals(args[0], args[1]), {
        initialProps: [mockSignalsQuery, indexName],
      });
      await waitForNextUpdate();
      await waitForNextUpdate();
      if (result.current.setQuery) {
        result.current.setQuery({ ...mockSignalsQuery });
      }
      await waitForNextUpdate();
      expect(spyOnfetchRules).toHaveBeenCalledTimes(2);
    });
  });

  test('if there is an error when fetching data, we should get back the init value for every properties', async () => {
    const spyOnGetUserPrivilege = jest.spyOn(api, 'fetchQuerySignals');
    spyOnGetUserPrivilege.mockImplementation(() => {
      throw new Error('Something went wrong, let see what happen');
    });
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<void, ReturnQuerySignals<unknown, unknown>>(
        () => useQuerySignals<unknown, unknown>(mockSignalsQuery, 'mock-index-name')
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
});
