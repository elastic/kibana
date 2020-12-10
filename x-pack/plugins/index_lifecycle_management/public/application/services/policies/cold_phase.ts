/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import { AllocateAction, ColdPhase, SerializedColdPhase } from '../../../../common/types';
import { serializedPhaseInitialization } from '../../constants';
import { isNumber, splitSizeAndUnits } from './policy_serialization';
import {
  numberRequiredMessage,
  PhaseValidationErrors,
  positiveNumberRequiredMessage,
} from './policy_validation';
import { determineDataTierAllocationType } from '../../lib';
import { serializePhaseWithAllocation } from './shared';

export const coldPhaseInitialization: ColdPhase = {
  phaseEnabled: false,
  selectedMinimumAge: '0',
  selectedMinimumAgeUnits: 'd',
  selectedNodeAttrs: '',
  selectedReplicaCount: '',
  freezeEnabled: false,
  phaseIndexPriority: '',
  dataTierAllocationType: 'default',
};

export const coldPhaseFromES = (phaseSerialized?: SerializedColdPhase): ColdPhase => {
  const phase = { ...coldPhaseInitialization };
  if (phaseSerialized === undefined || phaseSerialized === null) {
    return phase;
  }

  phase.phaseEnabled = true;

  if (phaseSerialized.actions) {
    phase.dataTierAllocationType = determineDataTierAllocationType(phaseSerialized.actions);
  }

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
      }
      if (allocate.number_of_replicas !== undefined && allocate.number_of_replicas !== null) {
        phase.selectedReplicaCount = allocate.number_of_replicas.toString();
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

export const coldPhaseToES = (
  phase: ColdPhase,
  originalPhase: SerializedColdPhase | undefined
): SerializedColdPhase => {
  if (!originalPhase) {
    originalPhase = { ...serializedPhaseInitialization };
  }

  const esPhase = { ...originalPhase };

  if (isNumber(phase.selectedMinimumAge)) {
    esPhase.min_age = `${phase.selectedMinimumAge}${phase.selectedMinimumAgeUnits}`;
  }

  esPhase.actions = serializePhaseWithAllocation(phase, esPhase.actions);

  if (isNumber(phase.selectedReplicaCount)) {
    esPhase.actions.allocate = esPhase.actions.allocate || ({} as AllocateAction);
    esPhase.actions.allocate.number_of_replicas = parseInt(phase.selectedReplicaCount, 10);
  } else {
    if (esPhase.actions.allocate) {
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

export const validateColdPhase = (phase: ColdPhase): PhaseValidationErrors<ColdPhase> => {
  if (!phase.phaseEnabled) {
    return {};
  }

  const phaseErrors = {} as PhaseValidationErrors<ColdPhase>;

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
