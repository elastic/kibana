/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DeletePhase, SerializedDeletePhase, serializedPhaseInitialization } from './policies';
import { isNumber, splitSizeAndUnits } from './policy_serialization';
import { PHASE_ROLLOVER_MINIMUM_AGE } from '../../constants';
import {
  numberRequiredMessage,
  positiveNumberRequiredMessage,
  ValidationErrors,
} from './policy_validation';

const deletePhaseInitialization: DeletePhase = {
  phaseEnabled: false,
  selectedMinimumAge: '0',
  selectedMinimumAgeUnits: 'd',
  waitForSnapshotPolicy: '',
};

export const deletePhaseFromES = (
  phaseSerializedOrUndefined?: SerializedDeletePhase
): DeletePhase => {
  const phase = { ...deletePhaseInitialization };
  if (!phaseSerializedOrUndefined) {
    return phase;
  }

  // after ! check it's safe to cast type as a serialized phase
  const phaseSerialized = phaseSerializedOrUndefined as SerializedDeletePhase;

  phase.phaseEnabled = true;
  if (phaseSerialized.min_age) {
    const { size: minAge, units: minAgeUnits } = splitSizeAndUnits(phaseSerialized.min_age);
    phase.selectedMinimumAge = minAge;
    phase.selectedMinimumAgeUnits = minAgeUnits;
  }

  if (phaseSerialized.actions) {
    const actions = phaseSerialized.actions;

    if (actions.wait_for_snapshot) {
      phase.waitForSnapshotPolicy = actions.wait_for_snapshot.policy;
    }
  }

  return phase;
};

export const deletePhaseToES = (
  phase: DeletePhase,
  originalEsPhase?: SerializedDeletePhase
): SerializedDeletePhase => {
  if (!originalEsPhase) {
    originalEsPhase = { ...serializedPhaseInitialization };
  }
  const esPhase = { ...originalEsPhase };

  if (isNumber(phase.selectedMinimumAge)) {
    esPhase.min_age = `${phase.selectedMinimumAge}${phase.selectedMinimumAgeUnits}`;
  }

  esPhase.actions = esPhase.actions ? { ...esPhase.actions } : {};

  if (phase.waitForSnapshotPolicy) {
    esPhase.actions.wait_for_snapshot = {
      policy: phase.waitForSnapshotPolicy,
    };
  } else {
    delete esPhase.actions.wait_for_snapshot;
  }

  return esPhase;
};

export const validateDeletePhase = (
  phase: DeletePhase,
  errors: ValidationErrors
): ValidationErrors => {
  if (!phase.phaseEnabled) {
    return errors;
  }

  const phaseErrors = {} as any;

  // min age needs to be a positive number
  if (!isNumber(phase.selectedMinimumAge)) {
    phaseErrors[PHASE_ROLLOVER_MINIMUM_AGE] = [numberRequiredMessage];
  } else if (parseInt(phase.selectedMinimumAge, 10) < 0) {
    phaseErrors[PHASE_ROLLOVER_MINIMUM_AGE] = [positiveNumberRequiredMessage];
  }

  return {
    ...errors,
    delete: {
      ...errors.delete,
      ...phaseErrors,
    },
  };
};
