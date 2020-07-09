/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { useWithSource, indicesExistOrDataTemporarilyUnavailable } from '.';
import { mockBrowserFields, mockIndexFields, mocksSource } from './mock';

jest.mock('../../lib/kibana');
jest.mock('../../utils/apollo_context', () => ({
  useApolloClient: jest.fn().mockReturnValue({
    query: jest.fn().mockImplementation(() => Promise.resolve(mocksSource[0].result)),
  }),
}));

describe('Index Fields & Browser Fields', () => {
  test('At initialization the value of indicesExists should be true', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useWithSource());
    const initialResult = result.current;

    await waitForNextUpdate();

    return expect(initialResult).toEqual({
      browserFields: {},
      errorMessage: null,
      indexPattern: {
        fields: [],
        title:
          'apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,packetbeat-*,winlogbeat-*,logs-*',
      },
      indicesExist: true,
      loading: true,
    });
  });

  test('returns memoized value', async () => {
    const { result, waitForNextUpdate, rerender } = renderHook(() => useWithSource());
    await waitForNextUpdate();

    const result1 = result.current;
    act(() => rerender());
    const result2 = result.current;

    return expect(result1).toBe(result2);
  });

  test('Index Fields', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useWithSource());

    await waitForNextUpdate();

    return expect(result).toEqual({
      current: {
        indicesExist: true,
        browserFields: mockBrowserFields,
        indexPattern: {
          fields: mockIndexFields,
          title:
            'apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,packetbeat-*,winlogbeat-*,logs-*',
        },
        loading: false,
        errorMessage: null,
      },
      error: undefined,
    });
  });

  describe('indicesExistOrDataTemporarilyUnavailable', () => {
    test('it returns true when undefined', () => {
      let undefVar;
      const result = indicesExistOrDataTemporarilyUnavailable(undefVar);
      expect(result).toBeTruthy();
    });
    test('it returns true when true', () => {
      const result = indicesExistOrDataTemporarilyUnavailable(true);
      expect(result).toBeTruthy();
    });
    test('it returns false when false', () => {
      const result = indicesExistOrDataTemporarilyUnavailable(false);
      expect(result).toBeFalsy();
    });
  });
});
