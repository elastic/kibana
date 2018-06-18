/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  PHASE_HOT,
  PHASE_WARM,
  PHASE_COLD,
  PHASE_DELETE,
  PHASE_ENABLED,
  PHASE_ROLLOVER_ENABLED,
  PHASE_ROLLOVER_MAX_AGE,
  PHASE_ROLLOVER_MAX_SIZE_STORED,
  STRUCTURE_INDEX_TEMPLATE,
  STRUCTURE_CONFIGURATION,
  STRUCTURE_PRIMARY_NODES,
  STRUCTURE_REPLICAS,
  STRUCTURE_TEMPLATE_SELECTION,
  STRUCTURE_TEMPLATE_NAME,
  STRUCTURE_POLICY_NAME,
  STRUCTURE_POLICY_CONFIGURATION,
  STRUCTURE_INDEX_NAME,
  STRUCTURE_ALIAS_NAME,
  ERROR_STRUCTURE,
  PHASE_ATTRIBUTES_THAT_ARE_NUMBERS,
  PHASE_PRIMARY_SHARD_COUNT,
  PHASE_SHRINK_ENABLED,
  STRUCTURE_REVIEW,
  PHASE_FORCE_MERGE_ENABLED,
  PHASE_FORCE_MERGE_SEGMENTS
} from '../constants';
import {
  getPhase,
  getPhases,
  phaseToES,
  getSelectedPolicyName,
  getSelectedIndexTemplateName,
  isNumber,
  getSelectedPrimaryShardCount,
  getSelectedReplicaCount,
  getSaveAsNewPolicy,
  getSelectedOriginalPolicyName,
  getBootstrapEnabled,
  getIndexName,
  getAliasName,
} from '.';

export const validatePhase = (type, phase) => {
  const errors = {};

  if (!phase[PHASE_ENABLED]) {
    return errors;
  }

  if (phase[PHASE_ROLLOVER_ENABLED]) {
    if (
      !isNumber(phase[PHASE_ROLLOVER_MAX_AGE]) &&
      !isNumber(phase[PHASE_ROLLOVER_MAX_SIZE_STORED])
    ) {
      errors[PHASE_ROLLOVER_MAX_AGE] = [
        'A maximum age is required'
      ];
      errors[PHASE_ROLLOVER_MAX_SIZE_STORED] = [
        'A maximum index size is required'
      ];
    }
  }

  for (const numberedAttribute of PHASE_ATTRIBUTES_THAT_ARE_NUMBERS) {
    if (phase.hasOwnProperty(numberedAttribute) && phase[numberedAttribute] !== '') {
      // If shrink is disabled, there is no need to validate this
      if (numberedAttribute === PHASE_PRIMARY_SHARD_COUNT && !phase[PHASE_SHRINK_ENABLED]) {
        continue;
      }
      if (!isNumber(phase[numberedAttribute])) {
        errors[numberedAttribute] = ['A number is required'];
      }
      else if (phase[numberedAttribute] < 0) {
        errors[numberedAttribute] = ['Only positive numbers are allowed'];
      }
      else if (numberedAttribute === PHASE_PRIMARY_SHARD_COUNT && phase[numberedAttribute] < 1) {
        errors[numberedAttribute] = ['Only positive numbers are allowed'];
      }
    }
  }

  if (phase[PHASE_SHRINK_ENABLED]) {
    if (!isNumber(phase[PHASE_PRIMARY_SHARD_COUNT])) {
      errors[PHASE_PRIMARY_SHARD_COUNT] = ['A number is required.'];
    }
    else if (phase[PHASE_PRIMARY_SHARD_COUNT] < 1) {
      errors[PHASE_PRIMARY_SHARD_COUNT] = ['Only positive numbers above 0 are allowed.'];
    }
  }

  if (phase[PHASE_FORCE_MERGE_ENABLED]) {
    if (!isNumber(phase[PHASE_FORCE_MERGE_SEGMENTS])) {
      errors[PHASE_FORCE_MERGE_SEGMENTS] = ['A number is required.'];
    }
    else if (phase[PHASE_FORCE_MERGE_SEGMENTS] < 1) {
      errors[PHASE_FORCE_MERGE_SEGMENTS] = ['Only positive numbers above 0 are allowed.'];
    }
  }

  return errors;
};

export const validateLifecycle = state => {
  // This method of deep copy does not always work but it should be fine here
  const errors = JSON.parse(JSON.stringify(ERROR_STRUCTURE));

  if (!getSelectedIndexTemplateName(state)) {
    errors[STRUCTURE_INDEX_TEMPLATE][STRUCTURE_TEMPLATE_SELECTION][
      STRUCTURE_TEMPLATE_NAME
    ].push('An index template is required');
  }

  if (getBootstrapEnabled(state) && !getIndexName(state)) {
    errors[STRUCTURE_INDEX_TEMPLATE][STRUCTURE_TEMPLATE_SELECTION][STRUCTURE_INDEX_NAME].push('An index name is required');
  }

  if (getBootstrapEnabled(state) && !getAliasName(state)) {
    errors[STRUCTURE_INDEX_TEMPLATE][STRUCTURE_TEMPLATE_SELECTION][STRUCTURE_ALIAS_NAME].push('An alias name is required');
  }

  if (!isNumber(getSelectedPrimaryShardCount(state))) {
    errors[STRUCTURE_INDEX_TEMPLATE][STRUCTURE_CONFIGURATION][
      STRUCTURE_PRIMARY_NODES
    ].push('A value is required');
  }
  else if (getSelectedPrimaryShardCount(state) < 1) {
    errors[STRUCTURE_INDEX_TEMPLATE][STRUCTURE_CONFIGURATION][
      STRUCTURE_PRIMARY_NODES
    ].push('Only positive numbers are allowed');
  }

  if (!isNumber(getSelectedReplicaCount(state))) {
    errors[STRUCTURE_INDEX_TEMPLATE][STRUCTURE_CONFIGURATION][
      STRUCTURE_REPLICAS
    ].push('A value is required');
  }
  else if (getSelectedReplicaCount(state) < 0) {
    errors[STRUCTURE_INDEX_TEMPLATE][STRUCTURE_CONFIGURATION][
      STRUCTURE_REPLICAS
    ].push('Only positive numbers are allowed');
  }

  if (!getSelectedPolicyName(state)) {
    errors[STRUCTURE_REVIEW][STRUCTURE_POLICY_NAME].push('A policy name is required');
  }

  if (getSaveAsNewPolicy(state) && getSelectedOriginalPolicyName(state) === getSelectedPolicyName(state)) {
    errors[STRUCTURE_REVIEW][STRUCTURE_POLICY_NAME].push('The policy name must be different');
  }

  // if (getSaveAsNewPolicy(state)) {
  //   const policyNames = getAllPolicyNamesFromTemplates(state);
  //   if (policyNames.includes(getSelectedPolicyName(state))) {
  //     errors[STRUCTURE_POLICY_CONFIGURATION][STRUCTURE_POLICY_NAME].push('That policy name is already used.');
  //   }
  // }

  const hotPhase = getPhase(state, PHASE_HOT);
  const warmPhase = getPhase(state, PHASE_WARM);
  const coldPhase = getPhase(state, PHASE_COLD);
  const deletePhase = getPhase(state, PHASE_DELETE);

  errors[STRUCTURE_POLICY_CONFIGURATION][PHASE_HOT] = {
    ...errors[STRUCTURE_POLICY_CONFIGURATION][PHASE_HOT],
    ...validatePhase(PHASE_HOT, hotPhase)
  };
  errors[STRUCTURE_POLICY_CONFIGURATION][PHASE_WARM] = {
    ...errors[STRUCTURE_POLICY_CONFIGURATION][PHASE_WARM],
    ...validatePhase(PHASE_WARM, warmPhase)
  };
  errors[STRUCTURE_POLICY_CONFIGURATION][PHASE_COLD] = {
    ...errors[STRUCTURE_POLICY_CONFIGURATION][PHASE_COLD],
    ...validatePhase(PHASE_COLD, coldPhase)
  };
  errors[STRUCTURE_POLICY_CONFIGURATION][PHASE_DELETE] = {
    ...errors[STRUCTURE_POLICY_CONFIGURATION][PHASE_DELETE],
    ...validatePhase(PHASE_DELETE, deletePhase)
  };

  if (warmPhase[PHASE_SHRINK_ENABLED]) {
    if (isNumber(warmPhase[PHASE_PRIMARY_SHARD_COUNT]) && warmPhase[PHASE_PRIMARY_SHARD_COUNT] > 0) {
      if (getSelectedPrimaryShardCount(state) % warmPhase[PHASE_PRIMARY_SHARD_COUNT] !== 0) {
        errors[STRUCTURE_POLICY_CONFIGURATION][PHASE_WARM][PHASE_PRIMARY_SHARD_COUNT].push(
          'The shard count needs to be a divisor of the hot phase shard count.'
        );
      }
    }
  }

  return errors;
};

export const getLifecycle = state => {
  const phases = Object.entries(getPhases(state)).reduce(
    (accum, [phaseName, phase]) => {
      // Hot is ALWAYS enabled
      if (phaseName === PHASE_HOT) {
        phase[PHASE_ENABLED] = true;
      }

      if (phase[PHASE_ENABLED]) {
        accum[phaseName] = phaseToES(state, phase);

        // These seem to be constants
        // TODO: verify this assumption
        if (phaseName === PHASE_HOT) {
          accum[phaseName].after = '0s';
        }

        if (phaseName === PHASE_DELETE) {
          accum[phaseName].actions = {
            ...accum[phaseName].actions,
            delete: {}
          };
        }
      }
      return accum;
    },
    {}
  );

  return {
    name: getSelectedPolicyName(state),
    //type, TODO: figure this out (jsut store it and not let the user change it?)
    phases
  };
};
