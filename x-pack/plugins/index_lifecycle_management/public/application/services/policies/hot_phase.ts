/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { serializedPhaseInitialization } from '../../constants';
import { isNumber, splitSizeAndUnits } from './policy_serialization';
import { HotPhase, SerializedHotPhase } from './types';
import {
  maximumAgeRequiredMessage,
  maximumDocumentsRequiredMessage,
  maximumSizeRequiredMessage,
  numberRequiredMessage,
  PhaseValidationErrors,
  positiveNumberRequiredMessage,
  positiveNumbersAboveZeroErrorMessage,
} from './policy_validation';

const hotPhaseInitialization: HotPhase = {
  phaseEnabled: false,
  rolloverEnabled: false,
  selectedMaxAge: '',
  selectedMaxAgeUnits: 'd',
  selectedMaxSizeStored: '',
  selectedMaxSizeStoredUnits: 'gb',
  phaseIndexPriority: '',
  selectedMaxDocuments: '',
};

export const hotPhaseFromES = (phaseSerialized?: SerializedHotPhase): HotPhase => {
  const phase: HotPhase = { ...hotPhaseInitialization };

  if (phaseSerialized === undefined || phaseSerialized === null) {
    return phase;
  }

  phase.phaseEnabled = true;

  if (phaseSerialized.actions) {
    const actions = phaseSerialized.actions;

    if (actions.rollover) {
      const rollover = actions.rollover;
      phase.rolloverEnabled = true;
      if (rollover.max_age) {
        const { size: maxAge, units: maxAgeUnits } = splitSizeAndUnits(rollover.max_age);
        phase.selectedMaxAge = maxAge;
        phase.selectedMaxAgeUnits = maxAgeUnits;
      }
      if (rollover.max_size) {
        const { size: maxSize, units: maxSizeUnits } = splitSizeAndUnits(rollover.max_size);
        phase.selectedMaxSizeStored = maxSize;
        phase.selectedMaxSizeStoredUnits = maxSizeUnits;
      }
      if (rollover.max_docs) {
        phase.selectedMaxDocuments = rollover.max_docs.toString();
      }
    }

    if (actions.set_priority) {
      phase.phaseIndexPriority = actions.set_priority.priority
        ? actions.set_priority.priority.toString()
        : '';
    }
  }

  return phase;
};

export const hotPhaseToES = (
  phase: HotPhase,
  originalPhase?: SerializedHotPhase
): SerializedHotPhase => {
  if (!originalPhase) {
    originalPhase = { ...serializedPhaseInitialization };
  }

  const esPhase = { ...originalPhase };

  esPhase.actions = esPhase.actions ? { ...esPhase.actions } : {};

  if (phase.rolloverEnabled) {
    if (!esPhase.actions.rollover) {
      esPhase.actions.rollover = {};
    }
    if (isNumber(phase.selectedMaxAge)) {
      esPhase.actions.rollover.max_age = `${phase.selectedMaxAge}${phase.selectedMaxAgeUnits}`;
    }
    if (isNumber(phase.selectedMaxSizeStored)) {
      esPhase.actions.rollover.max_size = `${phase.selectedMaxSizeStored}${phase.selectedMaxSizeStoredUnits}`;
    }
    if (isNumber(phase.selectedMaxDocuments)) {
      esPhase.actions.rollover.max_docs = parseInt(phase.selectedMaxDocuments, 10);
    }
  } else {
    delete esPhase.actions.rollover;
  }

  if (isNumber(phase.phaseIndexPriority)) {
    esPhase.actions.set_priority = {
      priority: parseInt(phase.phaseIndexPriority, 10),
    };
  } else {
    delete esPhase.actions.set_priority;
  }

  return esPhase;
};

export const validateHotPhase = (phase: HotPhase): PhaseValidationErrors<HotPhase> => {
  if (!phase.phaseEnabled) {
    return {};
  }

  const phaseErrors = {} as PhaseValidationErrors<HotPhase>;

  // index priority is optional, but if it's set, it needs to be a positive number
  if (phase.phaseIndexPriority) {
    if (!isNumber(phase.phaseIndexPriority)) {
      phaseErrors.phaseIndexPriority = [numberRequiredMessage];
    } else if (parseInt(phase.phaseIndexPriority, 10) < 0) {
      phaseErrors.phaseIndexPriority = [positiveNumberRequiredMessage];
    }
  }

  // if rollover is enabled
  if (phase.rolloverEnabled) {
    // either max_age, max_size or max_documents need to be set
    if (
      !isNumber(phase.selectedMaxAge) &&
      !isNumber(phase.selectedMaxSizeStored) &&
      !isNumber(phase.selectedMaxDocuments)
    ) {
      phaseErrors.selectedMaxAge = [maximumAgeRequiredMessage];
      phaseErrors.selectedMaxSizeStored = [maximumSizeRequiredMessage];
      phaseErrors.selectedMaxDocuments = [maximumDocumentsRequiredMessage];
    }

    // max age, max size and max docs need to be above zero if set
    if (isNumber(phase.selectedMaxAge) && parseInt(phase.selectedMaxAge, 10) < 1) {
      phaseErrors.selectedMaxAge = [positiveNumbersAboveZeroErrorMessage];
    }
    if (isNumber(phase.selectedMaxSizeStored) && parseInt(phase.selectedMaxSizeStored, 10) < 1) {
      phaseErrors.selectedMaxSizeStored = [positiveNumbersAboveZeroErrorMessage];
    }
    if (isNumber(phase.selectedMaxDocuments) && parseInt(phase.selectedMaxDocuments, 10) < 1) {
      phaseErrors.selectedMaxDocuments = [positiveNumbersAboveZeroErrorMessage];
    }
  }

  return {
    ...phaseErrors,
  };
};
