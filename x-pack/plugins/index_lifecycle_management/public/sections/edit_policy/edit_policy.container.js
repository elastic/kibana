/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { EditPolicy as PresentationComponent } from './edit_policy';
import {
  getSaveAsNewPolicy,
  getSelectedPolicy,
  getAffectedIndexTemplates,
  validateLifecycle,
  getLifecycle,
  getPolicies,
  isPolicyListLoaded,
  getIsNewPolicy
} from '../../store/selectors';
import {
  setSelectedPolicy,
  setSelectedPolicyName,
  setSaveAsNewPolicy,
  saveLifecyclePolicy,
  fetchPolicies,
} from '../../store/actions';
import { findFirstError } from '../../lib/find_errors';

export const EditPolicy = connect(
  state => {
    const errors = validateLifecycle(state);
    const firstError = findFirstError(errors);
    return {
      firstError,
      errors,
      selectedPolicy: getSelectedPolicy(state),
      affectedIndexTemplates: getAffectedIndexTemplates(state),
      saveAsNewPolicy: getSaveAsNewPolicy(state),
      lifecycle: getLifecycle(state),
      policies: getPolicies(state),
      isPolicyListLoaded: isPolicyListLoaded(state),
      isNewPolicy: getIsNewPolicy(state),
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
