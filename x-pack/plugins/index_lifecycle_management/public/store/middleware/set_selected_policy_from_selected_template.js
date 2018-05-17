/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  fetchedIndexTemplate,
  fetchPolicies,
  setSelectedPolicy
} from '../actions';

export const setSelectedPolicyFromSelectedTemplate = store => next => async action => {
  if (action.type === fetchedIndexTemplate().type) {
    const template = action.payload;
    if (template.settings.index && template.settings.index.lifecycle) {
      const policies = await fetchPolicies()(store.dispatch);
      const selectedPolicy = policies.find(policy => policy.name === template.settings.index.lifecycle.name);
      if (selectedPolicy) {
        store.dispatch(setSelectedPolicy(selectedPolicy));
      }
    }
  }

  return next(action);
};
