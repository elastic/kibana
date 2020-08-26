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
  defaultNewWarmPhase,
  defaultNewColdPhase,
} from '../constants/';

import { getUiMetricsForPhases } from './ui_metric';
jest.mock('ui/new_platform');

describe('getUiMetricsForPhases', () => {
  test('gets cold phase', () => {
    expect(
      getUiMetricsForPhases({
        cold: {
          min_age: '0ms',
          actions: {
            set_priority: {
              priority: parseInt(defaultNewColdPhase.phaseIndexPriority, 10),
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
          min_age: '0ms',
          actions: {
            set_priority: {
              priority: parseInt(defaultNewWarmPhase.phaseIndexPriority, 10),
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
          min_age: '0ms',
          actions: {
            set_priority: {
              priority: parseInt(defaultNewWarmPhase.phaseIndexPriority, 10) + 1,
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
          min_age: '0ms',
          actions: {
            freeze: {},
            set_priority: {
              priority: parseInt(defaultNewColdPhase.phaseIndexPriority, 10),
            },
          },
        },
      })
    ).toEqual([UIM_CONFIG_COLD_PHASE, UIM_CONFIG_FREEZE_INDEX]);
  });
});
