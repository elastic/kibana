/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useBrowserRunOnceMonitors } from './use_browser_run_once_monitors';
import * as resultHook from './use_browser_run_once_monitors';
import { WrappedHelper } from '../../../../lib/helper/rtl_helpers';

describe('useBrowserRunOnceMonitors', function () {
  it('should return results as expected', function () {
    jest.spyOn(resultHook, 'useBrowserEsResults').mockReturnValue({
      loading: false,
      data: {
        took: 4,
        timed_out: false,
        _shards: { total: 8, successful: 8, skipped: 2, failed: 0 },
        hits: {
          total: { value: 3, relation: 'eq' },
          max_score: null,
          hits: [],
        },
      },
    });

    const { result } = renderHook(() => useBrowserRunOnceMonitors({ configId: 'test-id' }), {
      wrapper: WrappedHelper,
    });

    expect(result.current).toEqual({
      data: undefined,
      journeyStarted: false,
      loading: true,
      stepsLoading: true,
      stepEnds: [],
      stepListData: undefined,
      summaryDoc: undefined,
    });
  });
});
