/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import { handleActions } from 'redux-actions';
import {
  fetchedPolicies,
  setSelectedPolicy,
  setSelectedPolicyName,
  setSaveAsNewPolicy,
  setPhaseData
} from '../actions';
import { policyFromES } from '../selectors';
import {
  PHASE_HOT,
  PHASE_WARM,
  PHASE_COLD,
  PHASE_DELETE,
  PHASE_ATTRIBUTES_THAT_ARE_NUMBERS,
  PHASE_ENABLED,
  PHASE_ROLLOVER_ENABLED,
  PHASE_FORCE_MERGE_SEGMENTS,
  PHASE_FORCE_MERGE_ENABLED,
  PHASE_ROLLOVER_AFTER,
  PHASE_NODE_ATTRS,
  PHASE_PRIMARY_SHARD_COUNT,
  PHASE_REPLICA_COUNT,
  PHASE_ROLLOVER_AFTER_UNITS,
  PHASE_ROLLOVER_MAX_AGE,
  PHASE_ROLLOVER_MAX_AGE_UNITS,
  PHASE_ROLLOVER_MAX_SIZE_STORED,
  PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS,
  PHASE_ROLLOVER_ALIAS,
  PHASE_ROLLOVER_MAX_DOC_SIZE,
  PHASE_SHRINK_ENABLED
} from '../constants';

export const defaultWarmPhase = {
  [PHASE_ENABLED]: false,
  [PHASE_ROLLOVER_ENABLED]: false,
  [PHASE_ROLLOVER_ALIAS]: '',
  [PHASE_FORCE_MERGE_SEGMENTS]: '',
  [PHASE_FORCE_MERGE_ENABLED]: false,
  [PHASE_ROLLOVER_AFTER]: '',
  [PHASE_ROLLOVER_AFTER_UNITS]: 's',
  [PHASE_NODE_ATTRS]: '',
  [PHASE_SHRINK_ENABLED]: true,
  [PHASE_PRIMARY_SHARD_COUNT]: '',
  [PHASE_REPLICA_COUNT]: ''
};

export const defaultHotPhase = {
  [PHASE_ENABLED]: true,
  [PHASE_ROLLOVER_ENABLED]: true,
  [PHASE_ROLLOVER_ALIAS]: '',
  [PHASE_ROLLOVER_MAX_AGE]: '',
  [PHASE_ROLLOVER_MAX_AGE_UNITS]: 's',
  [PHASE_ROLLOVER_MAX_SIZE_STORED]: '',
  [PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS]: 'gb',
  [PHASE_ROLLOVER_MAX_DOC_SIZE]: '',
};

export const defaultColdPhase = {
  [PHASE_ENABLED]: false,
  [PHASE_ROLLOVER_ENABLED]: false,
  [PHASE_ROLLOVER_ALIAS]: '',
  [PHASE_ROLLOVER_AFTER]: '',
  [PHASE_ROLLOVER_AFTER_UNITS]: 's',
  [PHASE_NODE_ATTRS]: '',
  [PHASE_REPLICA_COUNT]: ''
};

export const defaultDeletePhase = {
  [PHASE_ENABLED]: false,
  [PHASE_ROLLOVER_ENABLED]: false,
  [PHASE_ROLLOVER_ALIAS]: '',
  [PHASE_ROLLOVER_AFTER]: '',
  [PHASE_ROLLOVER_AFTER_UNITS]: 's'
};

export const defaultPolicy = {
  name: '',
  saveAsNew: true,
  phases: {
    [PHASE_HOT]: defaultHotPhase,
    [PHASE_WARM]: defaultWarmPhase,
    [PHASE_COLD]: defaultColdPhase,
    [PHASE_DELETE]: defaultDeletePhase
  }
};

const defaultState = {
  isLoading: false,
  originalPolicyName: undefined,
  selectedPolicySet: false,
  selectedPolicy: defaultPolicy,
  policies: []
};

export const policies = handleActions(
  {
    [fetchedPolicies](state, { payload: policies }) {
      return {
        ...state,
        isLoading: false,
        policies
      };
    },
    [setSelectedPolicy](state, { payload: selectedPolicy }) {
      if (!selectedPolicy) {
        return {
          ...state,
          selectedPolicy: defaultPolicy,
          selectedPolicySet: true,
        };
      }

      return {
        ...state,
        originalPolicyName: selectedPolicy.name,
        selectedPolicySet: true,
        selectedPolicy: {
          ...defaultPolicy,
          ...policyFromES(selectedPolicy)
        }
      };
    },
    [setSelectedPolicyName](state, { payload: name }) {
      return {
        ...state,
        selectedPolicy: {
          ...state.selectedPolicy,
          name
        }
      };
    },
    [setSaveAsNewPolicy](state, { payload: saveAsNew }) {
      return {
        ...state,
        selectedPolicy: {
          ...state.selectedPolicy,
          saveAsNew
        }
      };
    },
    [setPhaseData](state, { payload }) {
      const { phase, key } = payload;

      let value = payload.value;
      if (PHASE_ATTRIBUTES_THAT_ARE_NUMBERS.includes(key)) {
        value = parseInt(value);
        if (isNaN(value)) {
          value = '';
        }
      }

      return {
        ...state,
        selectedPolicy: {
          ...state.selectedPolicy,
          phases: {
            ...state.selectedPolicy.phases,
            [phase]: {
              ...state.selectedPolicy.phases[phase],
              [key]: value
            }
          }
        }
      };
    }
  },
  defaultState
);
