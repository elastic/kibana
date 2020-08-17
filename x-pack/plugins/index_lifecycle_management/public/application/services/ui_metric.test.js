/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  UIM_CONFIG_COLD_PHASE,
  UIM_CONFIG_WARM_PHASE,
  UIM_CONFIG_SET_PRIORITY,
  UIM_CONFIG_FREEZE_INDEX,
} from '../constants/ui_metric';

import { defaultNewWarmPhase, defaultNewColdPhase } from './policies/default_new_policy';

import { getUiMetricsForPhases } from './ui_metric';
jest.mock('ui/new_platform');

describe('getUiMetricsForPhases', () => {
  test('gets cold phase', () => {
    expect(
      getUiMetricsForPhases({
        cold: {
          actions: {
            set_priority: {
              priority: defaultNewColdPhase.phaseIndexPriority,
            },
          },
        },
      })
    ).toEqual([UIM_CONFIG_COLD_PHASE]);
  });

  test('gets warm phase', () => {
    expect(
      getUiMetricsForPhases({
        warm: {
          actions: {
            set_priority: {
              priority: defaultNewWarmPhase.phaseIndexPriority,
            },
          },
        },
      })
    ).toEqual([UIM_CONFIG_WARM_PHASE]);
  });

  test(`gets index priority if it's different than the default value`, () => {
    expect(
      getUiMetricsForPhases({
        warm: {
          actions: {
            set_priority: {
              priority: defaultNewWarmPhase.phaseIndexPriority + 1,
            },
          },
        },
      })
    ).toEqual([UIM_CONFIG_WARM_PHASE, UIM_CONFIG_SET_PRIORITY]);
  });

  test('gets freeze index', () => {
    expect(
      getUiMetricsForPhases({
        cold: {
          actions: {
            freeze: {},
            set_priority: {
              priority: defaultNewColdPhase.phaseIndexPriority,
            },
          },
        },
      })
    ).toEqual([UIM_CONFIG_COLD_PHASE, UIM_CONFIG_FREEZE_INDEX]);
  });
});
