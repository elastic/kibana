/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';
import type {
  ShowSuppressedAlertsParams,
  ShowSuppressedAlertsResult,
} from './use_show_suppressed_alerts';
import { useShowSuppressedAlerts } from './use_show_suppressed_alerts';

describe('useShowSuppressedAlerts', () => {
  let hookResult: RenderHookResult<ShowSuppressedAlertsParams, ShowSuppressedAlertsResult>;

  it('should return false if getFieldsData returns null', () => {
    const getFieldsData = () => null;
    hookResult = renderHook(() => useShowSuppressedAlerts({ getFieldsData }));

    expect(hookResult.result.current).toEqual({ show: false, alertSuppressionCount: 0 });
  });

  it('should return true if getFieldsData has the correct field', () => {
    const getFieldsData = () => '2';
    hookResult = renderHook(() => useShowSuppressedAlerts({ getFieldsData }));

    expect(hookResult.result.current).toEqual({ show: true, alertSuppressionCount: 2 });
  });
});
