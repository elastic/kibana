/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultCore, WrappedHelper } from '../../../lib/helper/rtl_helpers';
import { renderHook } from '@testing-library/react-hooks';
import { useMonitorName } from './use_monitor_name';

import * as hooks from '../../../hooks/use_monitor';

describe('useMonitorName', () => {
  it('returns expected results', () => {
    const { result } = renderHook(() => useMonitorName({}), { wrapper: WrappedHelper });

    expect(result.current).toStrictEqual({ nameAlreadyExists: false, validName: '' });
    expect(defaultCore.savedObjects.client.find).toHaveBeenCalledWith({
      aggs: {
        monitorNames: { terms: { field: 'synthetics-monitor.attributes.name', size: 10000 } },
      },
      perPage: 0,
      type: 'synthetics-monitor',
    });
  });

  it('returns expected results after data', async () => {
    defaultCore.savedObjects.client.find = jest.fn().mockReturnValue({
      aggregations: {
        monitorNames: {
          buckets: [{ key: 'Test' }, { key: 'Test 1' }],
        },
      },
    });

    const { result, waitForNextUpdate } = renderHook(() => useMonitorName({ search: 'Test' }), {
      wrapper: WrappedHelper,
    });

    expect(result.current).toStrictEqual({ nameAlreadyExists: false, validName: 'Test' });

    await waitForNextUpdate();

    expect(result.current).toStrictEqual({ nameAlreadyExists: true, validName: '' });
  });

  it('returns expected results after data while editing monitor', async () => {
    defaultCore.savedObjects.client.find = jest.fn().mockReturnValue({
      aggregations: {
        monitorNames: {
          buckets: [{ key: 'Test' }, { key: 'Test 1' }],
        },
      },
    });

    jest.spyOn(hooks, 'useMonitorId').mockReturnValue('test-id');

    const { result, waitForNextUpdate } = renderHook(() => useMonitorName({ search: 'Test' }), {
      wrapper: WrappedHelper,
    });

    expect(result.current).toStrictEqual({ nameAlreadyExists: false, validName: 'Test' });

    await waitForNextUpdate();

    expect(result.current).toStrictEqual({ nameAlreadyExists: false, validName: 'Test' });
  });
});
