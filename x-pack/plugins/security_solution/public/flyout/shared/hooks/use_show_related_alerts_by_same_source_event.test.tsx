/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';

import type {
  ShowRelatedAlertsBySameSourceEventParams,
  ShowRelatedAlertsBySameSourceEventResult,
} from './use_show_related_alerts_by_same_source_event';
import { useShowRelatedAlertsBySameSourceEvent } from './use_show_related_alerts_by_same_source_event';

describe('useShowRelatedAlertsBySameSourceEvent', () => {
  let hookResult: RenderHookResult<
    ShowRelatedAlertsBySameSourceEventParams,
    ShowRelatedAlertsBySameSourceEventResult
  >;

  it('should return false if getFieldsData returns null', () => {
    const getFieldsData = () => null;
    hookResult = renderHook(() => useShowRelatedAlertsBySameSourceEvent({ getFieldsData }));

    expect(hookResult.result.current).toEqual({ show: false });
  });

  it('should return true if getFieldsData has the correct field', () => {
    const getFieldsData = () => 'original_event';
    hookResult = renderHook(() => useShowRelatedAlertsBySameSourceEvent({ getFieldsData }));

    expect(hookResult.result.current).toEqual({ show: true, originalEventId: 'original_event' });
  });
});
