/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { MockRedux } from '../../../lib/helper/rtl_helpers';
import { useInlineErrors } from './use_inline_errors';
import { DEFAULT_THROTTLING } from '../../../../../common/runtime_types';
import * as obsvPlugin from '@kbn/observability-plugin/public/hooks/use_es_search';

function mockNow(date: string | number | Date) {
  const fakeNow = new Date(date).getTime();
  return jest.spyOn(Date, 'now').mockReturnValue(fakeNow);
}

describe('useInlineErrors', function () {
  it('it returns result as expected', async function () {
    mockNow('2022-01-02T00:00:00.000Z');
    const spy = jest.spyOn(obsvPlugin, 'useEsSearch');

    const { result } = renderHook(() => useInlineErrors({ onlyInvalidMonitors: true }), {
      wrapper: MockRedux,
    });

    expect(result.current).toEqual({
      loading: true,
    });

    expect(spy).toHaveBeenNthCalledWith(
      3,
      {
        body: {
          collapse: { field: 'config_id' },
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
          size: 1000,
          sort: [{ '@timestamp': 'desc' }],
        },
        index: 'synthetics-*',
      },
      [
        {
          error: { monitorList: null, serviceLocations: null, enablement: null },
          enablement: null,
          list: {
            monitors: [],
            page: 1,
            perPage: 10,
            total: null,
            syncErrors: null,
            absoluteTotal: 0,
          },
          loading: { monitorList: false, serviceLocations: false, enablement: false },
          locations: [],
          syntheticsService: {
            loading: false,
            signupUrl: null,
          },
          throttling: DEFAULT_THROTTLING,
        },
        1641081600000,
        true,
        '@timestamp',
        'desc',
      ],
      { name: 'getInvalidMonitors' }
    );
  });
});
