/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import {
  defaultHotPhase,
  defaultWarmPhase,
  defaultColdPhase,
  defaultDeletePhase
} from '../reducers/policies';
import {
  PHASE_HOT,
  PHASE_WARM,
  PHASE_COLD,
  PHASE_DELETE,
  PHASE_ROLLOVER_AFTER,
  PHASE_ROLLOVER_AFTER_UNITS,
  PHASE_ROLLOVER_ENABLED,
  PHASE_ROLLOVER_MAX_AGE,
  PHASE_ROLLOVER_MAX_AGE_UNITS,
  PHASE_ROLLOVER_MAX_SIZE_STORED,
  PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS,
  PHASE_NODE_ATTRS,
  PHASE_FORCE_MERGE_ENABLED,
  PHASE_FORCE_MERGE_SEGMENTS,
  PHASE_PRIMARY_SHARD_COUNT,
  PHASE_REPLICA_COUNT,
  PHASE_ENABLED,
  PHASE_ROLLOVER_ALIAS,
  PHASE_ATTRIBUTES_THAT_ARE_NUMBERS,
  MAX_SIZE_TYPE_DOCUMENT
} from '../constants';
import { getIndexTemplates } from '.';

export const getPolicies = state => state.policies.policies;
export const getSelectedPolicy = state => state.policies.selectedPolicy;
export const getIsSelectedPolicySet = state => state.policies.selectedPolicySet;
export const getSelectedOriginalPolicyName = state => state.policies.originalPolicyName;

export const getSaveAsNewPolicy = state =>
  state.policies.selectedPolicy.saveAsNew;

export const getSelectedPolicyName = state => {
  if (!getSaveAsNewPolicy(state)) {
    return getSelectedOriginalPolicyName(state);
  }
  return state.policies.selectedPolicy.name;
};

export const getAllPolicyNamesFromTemplates = state => {
  return getIndexTemplates(state).map(template => template.index_lifecycle_name).filter(name => name);
};

export const getPhases = state => state.policies.selectedPolicy.phases;
export const getPhase = (state, phase) =>
  getPhases(state)[phase];
export const getPhaseData = (state, phase, key) => {
  if (PHASE_ATTRIBUTES_THAT_ARE_NUMBERS.includes(key)) {
    return parseInt(getPhase(state, phase)[key]);
  }
  return getPhase(state, phase)[key];
};

export const splitSizeAndUnits = field => {
  let size;
  let units;

  const result = /(\d+)(\w+)/.exec(field);
  if (result) {
    size = parseInt(result[1]) || 0;
    units = result[2];
  }

  return {
    size,
    units
  };
};

export const isNumber = value => typeof value === 'number';

export const phaseFromES = (phase, defaultPolicy) => {
  const policy = { ...defaultPolicy };

  if (!phase) {
    return policy;
  }

  policy[PHASE_ENABLED] = true;

  if (phase.after) {
    const { size: after, units: afterUnits } = splitSizeAndUnits(
      phase.after
    );
    policy[PHASE_ROLLOVER_AFTER] = after;
    policy[PHASE_ROLLOVER_AFTER_UNITS] = afterUnits;
  }

  if (phase.actions) {
    const actions = phase.actions;

    if (actions.rollover) {
      const rollover = actions.rollover;
      policy[PHASE_ROLLOVER_ENABLED] = true;
      if (rollover.max_age) {
        const { size: maxAge, units: maxAgeUnits } = splitSizeAndUnits(
          rollover.max_age
        );
        policy[PHASE_ROLLOVER_MAX_AGE] = maxAge;
        policy[PHASE_ROLLOVER_MAX_AGE_UNITS] = maxAgeUnits;
      }
      if (rollover.max_size) {
        const { size: maxSize, units: maxSizeUnits } = splitSizeAndUnits(
          rollover.max_size
        );
        policy[PHASE_ROLLOVER_MAX_SIZE_STORED] = maxSize;
        policy[PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS] = maxSizeUnits;
      }
      if (rollover.max_docs) {
        policy[PHASE_ROLLOVER_MAX_SIZE_STORED] = rollover.max_docs;
        policy[PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS] = MAX_SIZE_TYPE_DOCUMENT;
      }
    } else {
      policy[PHASE_ROLLOVER_ENABLED] = false;
    }

    if (actions.allocate) {
      const allocate = actions.allocate;
      if (allocate.require) {
        policy[PHASE_NODE_ATTRS] = allocate.require._name;
      }
    }

    if (actions.forcemerge) {
      const forcemerge = actions.forcemerge;
      policy[PHASE_FORCE_MERGE_ENABLED] = true;
      policy[PHASE_FORCE_MERGE_SEGMENTS] = forcemerge.max_num_segments;
    }

    if (actions.shrink) {
      policy[PHASE_PRIMARY_SHARD_COUNT] = actions.shrink.number_of_shards;
    }

    if (actions.replicas) {
      const replicas = actions.replicas;
      policy[PHASE_REPLICA_COUNT] = replicas.number_of_replicas;
    }
  }

  return policy;
};

export const policyFromES = ({ name, type, phases }) => {
  return {
    name,
    type,
    phases: {
      [PHASE_HOT]: phaseFromES(phases[PHASE_HOT], defaultHotPhase),
      [PHASE_WARM]: phaseFromES(phases[PHASE_WARM], defaultWarmPhase),
      [PHASE_COLD]: phaseFromES(phases[PHASE_COLD], defaultColdPhase),
      [PHASE_DELETE]: phaseFromES(phases[PHASE_DELETE], defaultDeletePhase)
    }
  };
};

export const phaseToES = (state, phase) => {
  const esPhase = {};

  if (!phase[PHASE_ENABLED]) {
    return esPhase;
  }

  if (isNumber(phase[PHASE_ROLLOVER_AFTER])) {
    esPhase.after = `${phase[PHASE_ROLLOVER_AFTER]}${phase[PHASE_ROLLOVER_AFTER_UNITS]}`;
  }

  esPhase.actions = {};

  if (phase[PHASE_ROLLOVER_ENABLED]) {
    esPhase.actions.rollover = {
      alias: phase[PHASE_ROLLOVER_ALIAS],
    };

    if (isNumber(phase[PHASE_ROLLOVER_MAX_AGE])) {
      esPhase.actions.rollover.max_age = `${phase[PHASE_ROLLOVER_MAX_AGE]}${
        phase[PHASE_ROLLOVER_MAX_AGE_UNITS]
      }`;
    } else if (isNumber(phase[PHASE_ROLLOVER_MAX_SIZE_STORED])) {
      if (phase[PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS] === MAX_SIZE_TYPE_DOCUMENT) {
        esPhase.actions.rollover.max_docs = phase[PHASE_ROLLOVER_MAX_SIZE_STORED];
      } else {
        esPhase.actions.rollover.max_size = `${phase[PHASE_ROLLOVER_MAX_SIZE_STORED]}${
          phase[PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS]
        }`;
      }
    }
  }

  if (phase[PHASE_NODE_ATTRS]) {
    esPhase.actions.allocate = {
      include: {}, // TODO: this seems to be a constant, confirm?
      exclude: {}, // TODO: this seems to be a constant, confirm?
      require: {
        _name: phase[PHASE_NODE_ATTRS]
      }
    };
  }

  if (phase[PHASE_FORCE_MERGE_ENABLED]) {
    esPhase.actions.forcemerge = {
      max_num_segments: phase[PHASE_FORCE_MERGE_SEGMENTS]
    };
  }

  if (isNumber(phase[PHASE_PRIMARY_SHARD_COUNT])) {
    esPhase.actions.shrink = {
      number_of_shards: phase[PHASE_PRIMARY_SHARD_COUNT]
    };
  }

  if (isNumber(phase[PHASE_REPLICA_COUNT])) {
    esPhase.actions.replicas = {
      number_of_replicas: phase[PHASE_REPLICA_COUNT]
    };
  }

  return esPhase;
};
