/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { ReturnQueryAlerts } from './use_query';
import { useQueryAlerts } from './use_query';
import { ALERTS_QUERY_NAMES } from './constants';
import * as api from './api';
import { mockAlertsQuery, alertsMock } from './mock';

jest.mock('./api');
jest.mock('../../../../common/lib/apm/use_track_http_request');

const indexName = 'mock-index-name';
const defaultProps = {
  query: mockAlertsQuery,
  indexName,
  queryName: ALERTS_QUERY_NAMES.COUNT,
};

describe('useQueryAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('init', async () => {
    await act(async () => {
      const { result } = renderHook<
      ReturnQueryAlerts<unknown, unknown>,
        [object, string]
      >(() => useQueryAlerts<unknown, unknown>(defaultProps));
      // await waitFor();
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
      const { result } = renderHook<
      ReturnQueryAlerts<unknown, unknown>,
        [object, string]
      >(() => useQueryAlerts<unknown, unknown>(defaultProps));
      // await waitFor();
      // await waitFor();
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
      const { result } = renderHook<
      ReturnQueryAlerts<unknown, unknown>,
        [object, string]
      >(() => useQueryAlerts<unknown, unknown>(defaultProps));
      // await waitFor();
      // await waitFor();
      if (result.current.refetch) {
        result.current.refetch();
      }
      // await waitFor();
      expect(spyOnfetchQueryAlerts).toHaveBeenCalledTimes(2);
    });
  });

  test('fetch alert when index name changed', async () => {
    const spyOnfetchRules = jest.spyOn(api, 'fetchQueryAlerts');
    await act(async () => {
      const { rerender } = renderHook<
      ReturnQueryAlerts<unknown, unknown>,
        [object, string]
      >((args) => useQueryAlerts({ ...defaultProps, query: args[0], indexName: args[1] }), {
        initialProps: [mockAlertsQuery, indexName],
      });
      // await waitFor();
      // await waitFor();
      rerender([mockAlertsQuery, 'new-mock-index-name']);
      // await waitFor();
      expect(spyOnfetchRules).toHaveBeenCalledTimes(2);
    });
  });

  test('fetch alert when query object changed', async () => {
    const spyOnfetchRules = jest.spyOn(api, 'fetchQueryAlerts');
    await act(async () => {
      const { result } = renderHook<
      ReturnQueryAlerts<unknown, unknown>,
        [object, string]
      >((args) => useQueryAlerts({ ...defaultProps, query: args[0], indexName: args[1] }), {
        initialProps: [mockAlertsQuery, indexName],
      });
      // await waitFor();
      // await waitFor();
      if (result.current.setQuery) {
        result.current.setQuery({ ...mockAlertsQuery });
      }
      // await waitFor();
      expect(spyOnfetchRules).toHaveBeenCalledTimes(2);
    });
  });

  test('if there is an error when fetching data, we should get back the init value for every properties', async () => {
    const spyOnGetUserPrivilege = jest.spyOn(api, 'fetchQueryAlerts');
    spyOnGetUserPrivilege.mockImplementation(() => {
      throw new Error('Something went wrong, let see what happen');
    });
    await act(async () => {
      const { result } = renderHook<ReturnQueryAlerts<unknown, unknown>, void>(
        () => useQueryAlerts<unknown, unknown>(defaultProps)
      );
      // await waitFor();
      // await waitFor();
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
      const localProps = { ...defaultProps, skip: false };
      const { rerender } = renderHook<
      ReturnQueryAlerts<unknown, unknown>,
        [object, string]
      >(() => useQueryAlerts<unknown, unknown>(localProps));
      // await waitFor();
      // await waitFor();

      localProps.skip = true;
      act(() => rerender());
      act(() => rerender());
      expect(abortSpy).toHaveBeenCalledTimes(2);
    });
  });
});
