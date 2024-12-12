/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';

import type {
  UseShowRelatedAlertsBySessionParams,
  UseShowRelatedAlertsBySessionResult,
} from './use_show_related_alerts_by_session';
import { useShowRelatedAlertsBySession } from './use_show_related_alerts_by_session';

describe('useShowRelatedAlertsBySession', () => {
  let hookResult: RenderHookResult<
    UseShowRelatedAlertsBySessionResult,
    UseShowRelatedAlertsBySessionParams
  >;

  it('should return false if getFieldsData returns null', () => {
    const getFieldsData = () => null;
    hookResult = renderHook(() => useShowRelatedAlertsBySession({ getFieldsData }));

    expect(hookResult.result.current).toEqual({ show: false });
  });

  it('should return true if getFieldsData has the correct field', () => {
    const getFieldsData = () => 'entity_id';
    hookResult = renderHook(() => useShowRelatedAlertsBySession({ getFieldsData }));

    expect(hookResult.result.current).toEqual({ show: true, entityId: 'entity_id' });
  });
});
