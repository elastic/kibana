/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';

import type {
  UseFetchRelatedAlertsBySessionParams,
  UseFetchRelatedAlertsBySessionResult,
} from './use_fetch_related_alerts_by_session';
import { useFetchRelatedAlertsBySession } from './use_fetch_related_alerts_by_session';
import { useAlertPrevalence } from './use_alert_prevalence';

jest.mock('./use_alert_prevalence');

const entityId = 'entityId';
const scopeId = 'scopeId';

describe('useFetchRelatedAlertsBySession', () => {
  let hookResult: RenderHookResult<
    UseFetchRelatedAlertsBySessionParams,
    UseFetchRelatedAlertsBySessionResult
  >;

  it('should return loading true while data is loading', () => {
    (useAlertPrevalence as jest.Mock).mockReturnValue({
      loading: true,
      error: false,
      alertIds: [],
      count: 0,
    });
    hookResult = renderHook(() => useFetchRelatedAlertsBySession({ entityId, scopeId }));

    expect(hookResult.result.current.loading).toEqual(true);
    expect(hookResult.result.current.error).toEqual(false);
    expect(hookResult.result.current.data).toEqual([]);
    expect(hookResult.result.current.dataCount).toEqual(0);
  });

  it('should return error true while data has errored out', () => {
    (useAlertPrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
      alertIds: [],
      count: 0,
    });
    hookResult = renderHook(() => useFetchRelatedAlertsBySession({ entityId, scopeId }));

    expect(hookResult.result.current.loading).toEqual(false);
    expect(hookResult.result.current.error).toEqual(true);
    expect(hookResult.result.current.data).toEqual([]);
    expect(hookResult.result.current.dataCount).toEqual(0);
  });

  it('should return data and count when data fetching is successful', () => {
    (useAlertPrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      alertIds: ['1', '2'],
      count: 2,
    });
    hookResult = renderHook(() => useFetchRelatedAlertsBySession({ entityId, scopeId }));

    expect(hookResult.result.current.loading).toEqual(false);
    expect(hookResult.result.current.error).toEqual(false);
    expect(hookResult.result.current.data).toEqual(['1', '2']);
    expect(hookResult.result.current.dataCount).toEqual(2);
  });
});
