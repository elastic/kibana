/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import { serializedPhaseInitialization } from '../../constants';
import { AllocateAction, FrozenPhase, SerializedFrozenPhase } from './types';
import { isNumber, splitSizeAndUnits } from './policy_serialization';
import {
  numberRequiredMessage,
  PhaseValidationErrors,
  positiveNumberRequiredMessage,
} from './policy_validation';

const frozenPhaseInitialization: FrozenPhase = {
  phaseEnabled: false,
  selectedMinimumAge: '0',
  selectedMinimumAgeUnits: 'd',
  selectedNodeAttrs: '',
  selectedReplicaCount: '',
  freezeEnabled: false,
  phaseIndexPriority: '',
};

export const frozenPhaseFromES = (phaseSerialized?: SerializedFrozenPhase): FrozenPhase => {
  const phase = { ...frozenPhaseInitialization };
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
    if (actions.allocate) {
      const allocate = actions.allocate;
      if (allocate.require) {
        Object.entries(allocate.require).forEach((entry) => {
          phase.selectedNodeAttrs = entry.join(':');
        });
        if (allocate.number_of_replicas) {
          phase.selectedReplicaCount = allocate.number_of_replicas.toString();
        }
      }
    }

    if (actions.freeze) {
      phase.freezeEnabled = true;
    }

    if (actions.set_priority) {
      phase.phaseIndexPriority = actions.set_priority.priority
        ? actions.set_priority.priority.toString()
        : '';
    }
  }

  return phase;
};

export const frozenPhaseToES = (
  phase: FrozenPhase,
  originalPhase?: SerializedFrozenPhase
): SerializedFrozenPhase => {
  if (!originalPhase) {
    originalPhase = { ...serializedPhaseInitialization };
  }

  const esPhase = { ...originalPhase };

  if (isNumber(phase.selectedMinimumAge)) {
    esPhase.min_age = `${phase.selectedMinimumAge}${phase.selectedMinimumAgeUnits}`;
  }

  esPhase.actions = esPhase.actions ? { ...esPhase.actions } : {};

  if (phase.selectedNodeAttrs) {
    const [name, value] = phase.selectedNodeAttrs.split(':');
    esPhase.actions.allocate = esPhase.actions.allocate || ({} as AllocateAction);
    esPhase.actions.allocate.require = {
      [name]: value,
    };
  } else {
    if (esPhase.actions.allocate) {
      // @ts-expect-error
      delete esPhase.actions.allocate.require;
    }
  }

  if (isNumber(phase.selectedReplicaCount)) {
    esPhase.actions.allocate = esPhase.actions.allocate || ({} as AllocateAction);
    esPhase.actions.allocate.number_of_replicas = parseInt(phase.selectedReplicaCount, 10);
  } else {
    if (esPhase.actions.allocate) {
      // @ts-expect-error
      delete esPhase.actions.allocate.number_of_replicas;
    }
  }

  if (
    esPhase.actions.allocate &&
    !esPhase.actions.allocate.require &&
    !isNumber(esPhase.actions.allocate.number_of_replicas) &&
    isEmpty(esPhase.actions.allocate.include) &&
    isEmpty(esPhase.actions.allocate.exclude)
  ) {
    // remove allocate action if it does not define require or number of nodes
    // and both include and exclude are empty objects (ES will fail to parse if we don't)
    delete esPhase.actions.allocate;
  }

  if (phase.freezeEnabled) {
    esPhase.actions.freeze = {};
  } else {
    delete esPhase.actions.freeze;
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

export const validateFrozenPhase = (phase: FrozenPhase): PhaseValidationErrors<FrozenPhase> => {
  if (!phase.phaseEnabled) {
    return {};
  }

  const phaseErrors = {} as PhaseValidationErrors<FrozenPhase>;

  // index priority is optional, but if it's set, it needs to be a positive number
  if (phase.phaseIndexPriority) {
    if (!isNumber(phase.phaseIndexPriority)) {
      phaseErrors.phaseIndexPriority = [numberRequiredMessage];
    } else if (parseInt(phase.phaseIndexPriority, 10) < 0) {
      phaseErrors.phaseIndexPriority = [positiveNumberRequiredMessage];
    }
  }

  // min age needs to be a positive number
  if (!isNumber(phase.selectedMinimumAge)) {
    phaseErrors.selectedMinimumAge = [numberRequiredMessage];
  } else if (parseInt(phase.selectedMinimumAge, 10) < 0) {
    phaseErrors.selectedMinimumAge = [positiveNumberRequiredMessage];
  }

  return { ...phaseErrors };
};
