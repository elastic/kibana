/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SerializedEvent } from '@kbn/ui-actions-enhanced-plugin/common/types';
import { getDynamicActionsState } from './get_dynamic_actions_state';

describe('getDynamicActionsState', () => {
  test('should return empty state when enhancements is undefined', () => {
    expect(getDynamicActionsState()).toEqual({ dynamicActions: { events: [] } });
  });

  test('should return empty state when enhancements is empty object', () => {
    expect(getDynamicActionsState({})).toEqual({ dynamicActions: { events: [] } });
  });

  test('should return empty state when enhancements.dynamicActions is undefined', () => {
    expect(getDynamicActionsState({ dynamicActions: undefined })).toEqual({
      dynamicActions: { events: [] },
    });
  });

  test('should return empty state when enhancements.dynamicActions is empty object', () => {
    expect(getDynamicActionsState({ dynamicActions: {} })).toEqual({
      dynamicActions: { events: [] },
    });
  });

  test('should return state when enhancements.dynamicActions is provided', () => {
    expect(
      getDynamicActionsState({ dynamicActions: { events: [{} as unknown as SerializedEvent] } })
    ).toEqual({ dynamicActions: { events: [{}] } });
  });
});
