/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  UA_CONFIG_COLD_PHASE,
  UA_CONFIG_WARM_PHASE,
  UA_CONFIG_SET_PRIORITY,
  UA_CONFIG_FREEZE_INDEX,
} from '../../common/constants';

import {
  defaultColdPhase,
  defaultWarmPhase,
} from '../store/defaults';

import {
  PHASE_INDEX_PRIORITY,
} from '../constants';

import { getUserActionsForPhases } from './user_action';

describe('getUserActionsForPhases', () => {
  test('gets cold phase', () => {
    expect(getUserActionsForPhases({
      cold: {
        actions: {
          set_priority: {
            priority: defaultColdPhase[PHASE_INDEX_PRIORITY],
          },
        },
      },
    })).toEqual([UA_CONFIG_COLD_PHASE]);
  });

  test('gets warm phase', () => {
    expect(getUserActionsForPhases({
      warm: {
        actions: {
          set_priority: {
            priority: defaultWarmPhase[PHASE_INDEX_PRIORITY],
          },
        },
      },
    })).toEqual([UA_CONFIG_WARM_PHASE]);
  });

  test(`gets index priority if it's different than the default value`, () => {
    expect(getUserActionsForPhases({
      warm: {
        actions: {
          set_priority: {
            priority: defaultWarmPhase[PHASE_INDEX_PRIORITY] + 1,
          },
        },
      },
    })).toEqual([UA_CONFIG_WARM_PHASE, UA_CONFIG_SET_PRIORITY]);
  });

  test('gets freeze index', () => {
    expect(getUserActionsForPhases({
      cold: {
        actions: {
          freeze: {},
          set_priority: {
            priority: defaultColdPhase[PHASE_INDEX_PRIORITY],
          },
        },
      },
    })).toEqual([UA_CONFIG_COLD_PHASE, UA_CONFIG_FREEZE_INDEX]);
  });
});
