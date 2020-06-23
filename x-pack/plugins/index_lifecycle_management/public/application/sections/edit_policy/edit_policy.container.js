/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import {
  getSaveAsNewPolicy,
  getSelectedPolicy,
  validateLifecycle,
  getLifecycle,
  getPolicies,
  isPolicyListLoaded,
  getIsNewPolicy,
  getSelectedOriginalPolicyName,
} from '../../store/selectors';

import {
  setSelectedPolicy,
  setSelectedPolicyName,
  setSaveAsNewPolicy,
  saveLifecyclePolicy,
  fetchPolicies,
} from '../../store/actions';

import { findFirstError } from '../../services/find_errors';
import { EditPolicy as PresentationComponent } from './edit_policy';

export const EditPolicy = connect(
  (state) => {
    const errors = validateLifecycle(state);
    const firstError = findFirstError(errors);
    return {
      firstError,
      errors,
      selectedPolicy: getSelectedPolicy(state),
      saveAsNewPolicy: getSaveAsNewPolicy(state),
      lifecycle: getLifecycle(state),
      policies: getPolicies(state),
      isPolicyListLoaded: isPolicyListLoaded(state),
      isNewPolicy: getIsNewPolicy(state),
      originalPolicyName: getSelectedOriginalPolicyName(state),
    };
  },
  {
    setSelectedPolicy,
    setSelectedPolicyName,
    setSaveAsNewPolicy,
    saveLifecyclePolicy,
    fetchPolicies,
  }
)(PresentationComponent);
