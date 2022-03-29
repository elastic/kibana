/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { MockRedux } from '../../../lib/helper/rtl_helpers';
import { useInlineErrorsCount } from './use_inline_errors_count';
import * as obsvPlugin from '../../../../../observability/public/hooks/use_es_search';
import { DEFAULT_THROTTLING } from '../../../../common/runtime_types';

function mockNow(date: string | number | Date) {
  const fakeNow = new Date(date).getTime();
  return jest.spyOn(Date, 'now').mockReturnValue(fakeNow);
}

describe('useInlineErrorsCount', function () {
  it('it returns result as expected', async function () {
    mockNow('2022-01-02T00:00:00.000Z');
    const spy = jest.spyOn(obsvPlugin, 'useEsSearch');

    const { result } = renderHook(() => useInlineErrorsCount(), {
      wrapper: MockRedux,
    });

    expect(result.current).toEqual({
      loading: true,
    });

    expect(spy).toHaveBeenNthCalledWith(
      2,
      {
        body: {
          aggs: { total: { cardinality: { field: 'config_id' } } },
          query: {
            bool: {
              filter: [
                { exists: { field: 'summary' } },
                { exists: { field: 'error' } },
                {
                  bool: {
                    minimum_should_match: 1,
                    should: [
                      { match_phrase: { 'error.message': 'journey did not finish executing' } },
                      { match_phrase: { 'error.message': 'ReferenceError:' } },
                    ],
                  },
                },
                {
                  range: {
                    'monitor.timespan': {
                      gte: '2022-01-01T23:55:00.000Z',
                      lte: '2022-01-02T00:00:00.000Z',
                    },
                  },
                },
                { bool: { must_not: { exists: { field: 'run_once' } } } },
              ],
            },
          },
          size: 0,
        },
        index: 'heartbeat-8*,heartbeat-7*,synthetics-*',
      },
      [
        'heartbeat-8*,heartbeat-7*,synthetics-*',
        {
          error: { monitorList: null, serviceLocations: null, enablement: null },
          list: { monitors: [], page: 1, perPage: 10, total: null },
          enablement: null,
          loading: { monitorList: false, serviceLocations: false, enablement: false },
          locations: [],
          syntheticsService: {
            loading: false,
          },
          throttling: DEFAULT_THROTTLING,
        },
        1641081600000,
      ],
      { name: 'getInvalidMonitorsCount' }
    );
  });
});
