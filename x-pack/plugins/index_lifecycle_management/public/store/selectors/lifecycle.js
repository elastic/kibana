/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
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
  getSaveAsNewPolicy,
  getSelectedOriginalPolicyName,
  getPolicies
} from '.';
const numberRequiredMessage = i18n.translate('xpack.indexLifecycleMgmt.editPolicy.numberRequiredError', {
  defaultMessage: 'A number is required'
});
const positiveNumberRequiredMessage = i18n.translate('xpack.indexLifecycleMgmt.editPolicy.positiveNumberRequiredError', {
  defaultMessage: 'Only positive numbers are allowed'
});
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
        i18n.translate('xpack.indexLifecycleMgmt.editPolicy.maximumAgeMissingError', {
          defaultMessage: 'A maximum age is required'
        })
      ];
      phaseErrors[PHASE_ROLLOVER_MAX_SIZE_STORED] = [
        i18n.translate('xpack.indexLifecycleMgmt.editPolicy.maximumIndexSizeMissingError', {
          defaultMessage: 'A maximum index size is required'
        })
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
        phaseErrors[numberedAttribute] = [numberRequiredMessage];
      }
      else if (phase[numberedAttribute] < 0) {
        phaseErrors[numberedAttribute] = [positiveNumberRequiredMessage];
      }
      else if (numberedAttribute === PHASE_PRIMARY_SHARD_COUNT && phase[numberedAttribute] < 1) {
        phaseErrors[numberedAttribute] = [positiveNumberRequiredMessage];
      }
    }
  }

  if (phase[PHASE_SHRINK_ENABLED]) {
    if (!isNumber(phase[PHASE_PRIMARY_SHARD_COUNT])) {
      phaseErrors[PHASE_PRIMARY_SHARD_COUNT] = [numberRequiredMessage];
    }
    else if (phase[PHASE_PRIMARY_SHARD_COUNT] < 1) {
      phaseErrors[PHASE_PRIMARY_SHARD_COUNT] = [positiveNumberRequiredMessage];
    }
  }

  if (phase[PHASE_FORCE_MERGE_ENABLED]) {
    if (!isNumber(phase[PHASE_FORCE_MERGE_SEGMENTS])) {
      phaseErrors[PHASE_FORCE_MERGE_SEGMENTS] = [numberRequiredMessage];
    }
    else if (phase[PHASE_FORCE_MERGE_SEGMENTS] < 1) {
      phaseErrors[PHASE_FORCE_MERGE_SEGMENTS] = [
        i18n.translate('xpack.indexLifecycleMgmt.editPolicy.positiveNumberAboveZeroRequiredError', {
          defaultMessage: 'Only positive numbers above 0 are allowed'
        })
      ];
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
  const policyName = getSelectedPolicyName(state);
  if (!policyName) {
    errors[STRUCTURE_POLICY_NAME].push(i18n.translate('xpack.indexLifecycleMgmt.editPolicy.policyNameRequiredError', {
      defaultMessage: 'A policy name is required'
    }));
  } else {
    if (policyName.startsWith('_')) {
      errors[STRUCTURE_POLICY_NAME].push(i18n.translate('xpack.indexLifecycleMgmt.editPolicy.policyNameStartsWithUnderscoreError', {
        defaultMessage: 'A policy name cannot start with an underscore'
      }));
    }
    if (policyName.includes(',')) {
      errors[STRUCTURE_POLICY_NAME].push(i18n.translate('xpack.indexLifecycleMgmt.editPolicy.policyNameContainsCommaError', {
        defaultMessage: 'A policy name cannot include a comma'
      }));
    }
    if (policyName.includes(' ')) {
      errors[STRUCTURE_POLICY_NAME].push(i18n.translate('xpack.indexLifecycleMgmt.editPolicy.policyNameContainsSpaceError', {
        defaultMessage: 'A policy name cannot include a space'
      }));
    }
    if (TextEncoder && new TextEncoder('utf-8').encode(policyName).length > 255) {
      errors[STRUCTURE_POLICY_NAME].push(i18n.translate('xpack.indexLifecycleMgmt.editPolicy.policyNameTooLongError', {
        defaultMessage: 'A policy name cannot be longer than 255 bytes'
      }));
    }
  }

  if (getSaveAsNewPolicy(state) && getSelectedOriginalPolicyName(state) === getSelectedPolicyName(state)) {
    errors[STRUCTURE_POLICY_NAME].push(i18n.translate('xpack.indexLifecycleMgmt.editPolicy.differentPolicyNameRequiredError', {
      defaultMessage: 'The policy name must be different'
    }));
  }

  if (getSaveAsNewPolicy(state)) {
    const policyNames = getPolicies(state).map(policy => policy.name);
    if (policyNames.includes(getSelectedPolicyName(state))) {
      errors[STRUCTURE_POLICY_NAME].push(i18n.translate('xpack.indexLifecycleMgmt.editPolicy.policyNameAlreadyUsedError', {
        defaultMessage: 'That policy name is already used'
      }));
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
          accum[phaseName].min_age = '0s';
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
