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
  STRUCTURE_POLICY_NAME,
  ERROR_STRUCTURE,
  PHASE_ATTRIBUTES_THAT_ARE_NUMBERS,
  PHASE_PRIMARY_SHARD_COUNT,
  PHASE_SHRINK_ENABLED,
  PHASE_FORCE_MERGE_ENABLED,
  PHASE_FORCE_MERGE_SEGMENTS
} from '../constants';
import {
  getPhase,
  getPhases,
  phaseToES,
  getSelectedPolicyName,
  isNumber,
  getSelectedPrimaryShardCount,
  getSaveAsNewPolicy,
  getSelectedOriginalPolicyName,
  getPolicies
} from '.';

export const validatePhase = (type, phase, errors) => {
  const phaseErrors = {};

  if (!phase[PHASE_ENABLED]) {
    return;
  }

  if (phase[PHASE_ROLLOVER_ENABLED]) {
    if (
      !isNumber(phase[PHASE_ROLLOVER_MAX_AGE]) &&
      !isNumber(phase[PHASE_ROLLOVER_MAX_SIZE_STORED])
    ) {
      phaseErrors[PHASE_ROLLOVER_MAX_AGE] = [
        'A maximum age is required'
      ];
      phaseErrors[PHASE_ROLLOVER_MAX_SIZE_STORED] = [
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
        phaseErrors[numberedAttribute] = ['A number is required'];
      }
      else if (phase[numberedAttribute] < 0) {
        phaseErrors[numberedAttribute] = ['Only positive numbers are allowed'];
      }
      else if (numberedAttribute === PHASE_PRIMARY_SHARD_COUNT && phase[numberedAttribute] < 1) {
        phaseErrors[numberedAttribute] = ['Only positive numbers are allowed'];
      }
    }
  }

  if (phase[PHASE_SHRINK_ENABLED]) {
    if (!isNumber(phase[PHASE_PRIMARY_SHARD_COUNT])) {
      phaseErrors[PHASE_PRIMARY_SHARD_COUNT] = ['A number is required.'];
    }
    else if (phase[PHASE_PRIMARY_SHARD_COUNT] < 1) {
      phaseErrors[PHASE_PRIMARY_SHARD_COUNT] = ['Only positive numbers are allowed.'];
    }
  }

  if (phase[PHASE_FORCE_MERGE_ENABLED]) {
    if (!isNumber(phase[PHASE_FORCE_MERGE_SEGMENTS])) {
      phaseErrors[PHASE_FORCE_MERGE_SEGMENTS] = ['A number is required.'];
    }
    else if (phase[PHASE_FORCE_MERGE_SEGMENTS] < 1) {
      phaseErrors[PHASE_FORCE_MERGE_SEGMENTS] = ['Only positive numbers above 0 are allowed.'];
    }
  }
  errors[type] = {
    ...errors[type],
    ...phaseErrors
  };
};

export const validateLifecycle = state => {
  // This method of deep copy does not always work but it should be fine here
  const errors = JSON.parse(JSON.stringify(ERROR_STRUCTURE));

  if (!getSelectedPolicyName(state)) {
    errors[STRUCTURE_POLICY_NAME].push('A policy name is required');
  }

  if (getSaveAsNewPolicy(state) && getSelectedOriginalPolicyName(state) === getSelectedPolicyName(state)) {
    errors[STRUCTURE_POLICY_NAME].push('The policy name must be different');
  }

  if (getSaveAsNewPolicy(state)) {
    const policyNames = getPolicies(state).map(policy => policy.name);
    if (policyNames.includes(getSelectedPolicyName(state))) {
      errors[STRUCTURE_POLICY_NAME].push('That policy name is already used.');
    }
  }

  const hotPhase = getPhase(state, PHASE_HOT);
  const warmPhase = getPhase(state, PHASE_WARM);
  const coldPhase = getPhase(state, PHASE_COLD);
  const deletePhase = getPhase(state, PHASE_DELETE);

  validatePhase(PHASE_HOT, hotPhase, errors);
  validatePhase(PHASE_WARM, warmPhase, errors);
  validatePhase(PHASE_COLD, coldPhase, errors);
  validatePhase(PHASE_DELETE, deletePhase, errors);
  if (warmPhase[PHASE_SHRINK_ENABLED]) {
    if (isNumber(warmPhase[PHASE_PRIMARY_SHARD_COUNT]) && warmPhase[PHASE_PRIMARY_SHARD_COUNT] > 0) {
      if (getSelectedPrimaryShardCount(state) % warmPhase[PHASE_PRIMARY_SHARD_COUNT] !== 0) {
        errors[PHASE_WARM][PHASE_PRIMARY_SHARD_COUNT].push(
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
          accum[phaseName].minimum_age = '0s';
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
