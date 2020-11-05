/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DeletePhase, SerializedDeletePhase } from '../../../../common/types';
import { serializedPhaseInitialization } from '../../constants';
import { isNumber, splitSizeAndUnits } from './policy_serialization';

const deletePhaseInitialization: DeletePhase = {
  phaseEnabled: false,
  selectedMinimumAge: '0',
  selectedMinimumAgeUnits: 'd',
  waitForSnapshotPolicy: '',
};

export const deletePhaseFromES = (phaseSerialized?: SerializedDeletePhase): DeletePhase => {
  const phase = { ...deletePhaseInitialization };
  if (phaseSerialized === undefined || phaseSerialized === null) {
    return phase;
  }

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
