/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { useWithSource, indicesExistOrDataTemporarilyUnavailable } from '.';
import { NO_ALERT_INDEX } from '../../../../common/constants';
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
      docValueFields: [],
      errorMessage: null,
      indexPattern: {
        fields: [],
        title:
          'apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,winlogbeat-*',
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
        docValueFields: [
          {
            field: '@timestamp',
            format: 'date_time',
          },
          {
            field: 'event.end',
            format: 'date_time',
          },
        ],
        indexPattern: {
          fields: mockIndexFields,
          title:
            'apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,winlogbeat-*',
        },
        loading: false,
        errorMessage: null,
      },
      error: undefined,
    });
  });

  test('Make sure we are not querying for NO_ALERT_INDEX and it is not includes in the index pattern', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useWithSource('default', [NO_ALERT_INDEX])
    );

    await waitForNextUpdate();
    return expect(result.current.indexPattern.title).toEqual(
      'apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,winlogbeat-*'
    );
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
