/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SerializedEvent } from '@kbn/ui-actions-enhanced-plugin/common/types';
import { initDynamicActionsState } from './init_dynamic_actions_state';

describe('initDynamicActionsState', () => {
  test('should return empty state when enhancements is undefined', () => {
    expect(initDynamicActionsState()).toEqual({ dynamicActions: { events: [] } });
  });

  test('should return empty state when enhancements is empty object', () => {
    expect(initDynamicActionsState()).toEqual({ dynamicActions: { events: [] } });
  });

  test('should return empty state when enhancements.dynamicActions is undefined', () => {
    expect(initDynamicActionsState({ dynamicActions: undefined })).toEqual({ dynamicActions: { events: [] } });
  });

  test('should return empty state when enhancements.dynamicActions is empty object', () => {
    expect(initDynamicActionsState({ dynamicActions: {} })).toEqual({ dynamicActions: { events: [] } });
  });

  test('should return state when enhancements.dynamicActions is provided', () => {
    expect(initDynamicActionsState({ dynamicActions: { events: [{} as unknown as SerializedEvent] } })).toEqual({ dynamicActions: { events: [{}] } });
  });
});