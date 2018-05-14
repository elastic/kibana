/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  setPhaseData
} from '../actions';
import { getPhaseData } from '../selectors';
import { PHASE_ENABLED } from '../constants';

const setsPerPhase = {};

export const autoEnablePhase = store => next => action => {
  const state = store.getState();

  if (action.type === setPhaseData().type) {
    const { phase } = action.payload;
    setsPerPhase[phase] = setsPerPhase[phase] || 0;
    setsPerPhase[phase]++;

    if (setsPerPhase[phase] === 1 && !getPhaseData(state, phase, PHASE_ENABLED)) {
      store.dispatch(setPhaseData(phase, PHASE_ENABLED, true));
    }
  }

  return next(action);
};
