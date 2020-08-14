/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isNumber, splitSizeAndUnits } from './policy_serialization';
import { HotPhase, SerializedHotPhase } from './policies';
import {
  maximumAgeRequiredMessage,
  maximumDocumentsRequiredMessage,
  maximumSizeRequiredMessage,
  numberRequiredMessage,
  positiveNumberRequiredMessage,
  positiveNumbersAboveZeroErrorMessage,
  ValidationErrors,
} from './policy_validation';
import {
  PHASE_INDEX_PRIORITY,
  PHASE_ROLLOVER_MAX_AGE,
  PHASE_ROLLOVER_MAX_DOCUMENTS,
  PHASE_ROLLOVER_MAX_SIZE_STORED,
} from '../../constants';

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

export const hotPhaseFromES = (phaseSerializedOrUndefined: SerializedHotPhase): HotPhase => {
  const phase: HotPhase = { ...hotPhaseInitialization };

  if (!phaseSerializedOrUndefined) {
    return phase;
  }

  // after ! check it's safe to cast type as a serialized phase
  const phaseSerialized = phaseSerializedOrUndefined as SerializedHotPhase;

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
  originalPhase: SerializedHotPhase
): SerializedHotPhase => {
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

export const validateHotPhase = (phase: HotPhase, errors: ValidationErrors): ValidationErrors => {
  if (!phase.phaseEnabled) {
    return errors;
  }

  const phaseErrors = {} as any;

  // index priority is optional, but if it's set, it needs to be a positive number
  if (phase.phaseIndexPriority) {
    if (!isNumber(phase.phaseIndexPriority)) {
      phaseErrors[PHASE_INDEX_PRIORITY] = [numberRequiredMessage];
    } else if (parseInt(phase.phaseIndexPriority, 10) < 0) {
      phaseErrors[PHASE_INDEX_PRIORITY] = [positiveNumberRequiredMessage];
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
      phaseErrors[PHASE_ROLLOVER_MAX_AGE] = [maximumAgeRequiredMessage];
      phaseErrors[PHASE_ROLLOVER_MAX_SIZE_STORED] = [maximumSizeRequiredMessage];
      phaseErrors[PHASE_ROLLOVER_MAX_DOCUMENTS] = [maximumDocumentsRequiredMessage];
    }

    // max age, max size and max docs need to be above zero if set
    if (isNumber(phase.selectedMaxAge) && parseInt(phase.selectedMaxAge, 10) < 1) {
      phaseErrors[PHASE_ROLLOVER_MAX_AGE] = [positiveNumbersAboveZeroErrorMessage];
    }
    if (isNumber(phase.selectedMaxSizeStored) && parseInt(phase.selectedMaxSizeStored, 10) < 1) {
      phaseErrors[PHASE_ROLLOVER_MAX_SIZE_STORED] = [positiveNumbersAboveZeroErrorMessage];
    }
    if (isNumber(phase.selectedMaxDocuments) && parseInt(phase.selectedMaxDocuments, 10) < 1) {
      phaseErrors[PHASE_ROLLOVER_MAX_DOCUMENTS] = [positiveNumbersAboveZeroErrorMessage];
    }
  }

  return {
    ...errors,
    hot: {
      ...errors.hot,
      ...phaseErrors,
    },
  };
};
