/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  fetchedIndexTemplate,
  fetchPolicies,
  setSelectedPolicy,
  setPhaseData
} from '../actions';
import { getSelectedNodeAttrs, getPhaseData } from '../selectors';
import { PHASE_WARM, PHASE_NODE_ATTRS, PHASE_COLD } from '../constants';

export const setSelectedPolicyFromSelectedTemplate = store => next => async action => {
  if (action.type === fetchedIndexTemplate().type) {
    const template = action.payload;
    if (template.settings.index && template.settings.index.lifecycle) {
      const policies = await fetchPolicies()(store.dispatch);
      const selectedPolicy = policies.find(policy => policy.name === template.settings.index.lifecycle.name);
      if (selectedPolicy) {
        store.dispatch(setSelectedPolicy(selectedPolicy));

        // We also want to update node attrs for future phases if they do not exist
        const state = store.getState();
        const hotNodeAttrs = getSelectedNodeAttrs(state);
        const warmNodeAttrs = getPhaseData(state, PHASE_WARM, PHASE_NODE_ATTRS);
        const coldNodeAttrs = getPhaseData(state, PHASE_COLD, PHASE_NODE_ATTRS);

        if (hotNodeAttrs && !warmNodeAttrs) {
          store.dispatch(setPhaseData(PHASE_WARM, PHASE_NODE_ATTRS, hotNodeAttrs));
        }
        if ((hotNodeAttrs || warmNodeAttrs) && !coldNodeAttrs) {
          store.dispatch(setPhaseData(PHASE_COLD, PHASE_NODE_ATTRS, warmNodeAttrs || hotNodeAttrs));
        }
      }
    }
  }

  return next(action);
};
