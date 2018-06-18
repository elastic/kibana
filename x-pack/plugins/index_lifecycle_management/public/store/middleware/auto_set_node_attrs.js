/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  setPhaseData, setSelectedNodeAttrs
} from '../actions';
import { getPhaseData } from '../selectors';
import { PHASE_WARM, PHASE_NODE_ATTRS, PHASE_COLD } from '../constants';

export const autoSetNodeAttrs = store => next => action => {
  const state = store.getState();

  if (action.type === setSelectedNodeAttrs().type) {
    const warmPhaseAttrs = getPhaseData(state, PHASE_WARM, PHASE_NODE_ATTRS);
    if (!warmPhaseAttrs) {
      store.dispatch(setPhaseData(PHASE_WARM, PHASE_NODE_ATTRS, action.payload));
    }
  }
  else if (action.type === setPhaseData().type) {
    const { phase, key, value } = action.payload;

    if (phase === PHASE_WARM && key === PHASE_NODE_ATTRS) {
      const coldPhaseAttrs = getPhaseData(state, PHASE_COLD, PHASE_NODE_ATTRS);
      if (!coldPhaseAttrs) {
        store.dispatch(setPhaseData(PHASE_COLD, PHASE_NODE_ATTRS, value));
      }
    }
  }

  return next(action);
};
