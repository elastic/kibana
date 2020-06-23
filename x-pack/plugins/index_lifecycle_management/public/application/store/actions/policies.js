/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { createAction } from 'redux-actions';

import { showApiError } from '../../services/api_errors';
import { loadPolicies } from '../../services/api';
import { SET_PHASE_DATA } from '../../constants';

export const fetchedPolicies = createAction('FETCHED_POLICIES');
export const setSelectedPolicy = createAction('SET_SELECTED_POLICY');
export const unsetSelectedPolicy = createAction('UNSET_SELECTED_POLICY');
export const setSelectedPolicyName = createAction('SET_SELECTED_POLICY_NAME');
export const setSaveAsNewPolicy = createAction('SET_SAVE_AS_NEW_POLICY');
export const policySortChanged = createAction('POLICY_SORT_CHANGED');
export const policyPageSizeChanged = createAction('POLICY_PAGE_SIZE_CHANGED');
export const policyPageChanged = createAction('POLICY_PAGE_CHANGED');
export const policySortDirectionChanged = createAction('POLICY_SORT_DIRECTION_CHANGED');
export const policyFilterChanged = createAction('POLICY_FILTER_CHANGED');

export const fetchPolicies = (withIndices, callback) => async (dispatch) => {
  let policies;
  try {
    policies = await loadPolicies(withIndices);
  } catch (err) {
    const title = i18n.translate('xpack.indexLifecycleMgmt.editPolicy.loadPolicyErrorMessage', {
      defaultMessage: 'Error loading policies',
    });
    showApiError(err, title);
    return false;
  }

  dispatch(fetchedPolicies(policies));
  if (policies.length === 0) {
    dispatch(setSelectedPolicy());
  }
  callback && callback();
  return policies;
};

export const setPhaseData = createAction(SET_PHASE_DATA, (phase, key, value) => ({
  phase,
  key,
  value,
}));
