/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';

import type { UseShowRelatedAlertsBySessionParams } from './use_show_related_alerts_by_session';
import { useShowRelatedAlertsBySession } from './use_show_related_alerts_by_session';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';

describe('useShowRelatedAlertsBySession', () => {
  let hookResult: RenderHookResult<UseShowRelatedAlertsBySessionParams, boolean>;

  it('should return false if dataFormattedForFieldBrowser is null', () => {
    const dataFormattedForFieldBrowser = null;
    hookResult = renderHook(() => useShowRelatedAlertsBySession({ dataFormattedForFieldBrowser }));

    expect(hookResult.result.current).toEqual(false);
  });

  it('should return false if dataFormattedForFieldBrowser is missing the correct field', () => {
    const dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] = [];
    hookResult = renderHook(() => useShowRelatedAlertsBySession({ dataFormattedForFieldBrowser }));

    expect(hookResult.result.current).toEqual(false);
  });

  it('should return true if dataFormattedForFieldBrowser has the correct field', () => {
    const dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] = [
      {
        category: 'process',
        field: 'process.entry_leader.entity_id',
        isObjectArray: false,
        originalValue: ['abc'],
        values: ['abc'],
      },
    ];
    hookResult = renderHook(() => useShowRelatedAlertsBySession({ dataFormattedForFieldBrowser }));

    expect(hookResult.result.current).toEqual(true);
  });
});
