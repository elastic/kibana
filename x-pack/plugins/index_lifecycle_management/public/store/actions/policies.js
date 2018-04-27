/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import { createAction } from 'redux-actions';
import { toastNotifications } from 'ui/notify';
import { loadPolicies } from '../../api';

export const fetchedPolicies = createAction('FETCHED_POLICIES');
export const fetchPolicies = () => async dispatch => {
  let policies;
  try {
    policies = await loadPolicies();
  }
  catch (err) {
    return toastNotifications.addDanger(err.data.message);
  }

  dispatch(fetchedPolicies(policies));
};

export const setSelectedPolicy = createAction('SET_SELECTED_POLICY');
export const setSelectedPolicyName = createAction('SET_SELECTED_POLICY_NAME');
export const setSaveAsNewPolicy = createAction('SET_SAVE_AS_NEW_POLICY');

export const setPhaseData = createAction('SET_PHASE_DATA', (phase, key, value) => ({ phase, key, value }));
