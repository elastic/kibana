/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

import { createUserActionUri } from '../../../../common/user_action';

import {
  UA_APP_NAME,
  UA_CONFIG_COLD_PHASE,
  UA_CONFIG_WARM_PHASE,
  UA_CONFIG_SET_PRIORITY,
  UA_CONFIG_FREEZE_INDEX,
} from '../../common/constants';

import {
  PHASE_HOT,
  PHASE_WARM,
  PHASE_COLD,
  PHASE_INDEX_PRIORITY,
} from '../constants';

import {
  defaultColdPhase,
  defaultWarmPhase,
  defaultHotPhase,
} from '../store/defaults';

import { getHttpClient } from './api';

export function trackUserAction(actionType, httpClient = getHttpClient()) {
  const userActionUri = createUserActionUri(UA_APP_NAME, actionType);
  httpClient.post(userActionUri);
}

export function getUserActionsForPhases(phases) {
  const possibleUserActions = [{
    action: UA_CONFIG_COLD_PHASE,
    isExecuted: () => Boolean(phases[PHASE_COLD]),
  }, {
    action: UA_CONFIG_WARM_PHASE,
    isExecuted: () => Boolean(phases[PHASE_WARM]),
  }, {
    action: UA_CONFIG_SET_PRIORITY,
    isExecuted: () => {
      const phaseToDefaultIndexPriorityMap = {
        [PHASE_HOT]: defaultHotPhase[PHASE_INDEX_PRIORITY],
        [PHASE_WARM]: defaultWarmPhase[PHASE_INDEX_PRIORITY],
        [PHASE_COLD]: defaultColdPhase[PHASE_INDEX_PRIORITY],
      };

      // We only care about whether the user has interacted with the priority of *any* phase at all.
      return [ PHASE_HOT, PHASE_WARM, PHASE_COLD ].some(phase => {
        // If the priority is different than the default, we'll consider it a user interaction,
        // even if the user has set it to undefined.
        return phases[phase] && get(phases[phase], 'actions.set_priority.priority') !== phaseToDefaultIndexPriorityMap[phase];
      });
    },
  }, {
    action: UA_CONFIG_FREEZE_INDEX,
    isExecuted: () => phases[PHASE_COLD] && get(phases[PHASE_COLD], 'actions.freeze'),
  }];

  const executedUserActions = possibleUserActions.reduce((executed, { action, isExecuted }) => {
    if (isExecuted()) {
      executed.push(action);
    }
    return executed;
  }, []);

  return executedUserActions;
}
