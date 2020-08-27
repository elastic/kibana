/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import { serializedPhaseInitialization } from '../../constants';
import { AllocateAction, WarmPhase, SerializedWarmPhase } from './types';
import { isNumber, splitSizeAndUnits } from './policy_serialization';

import {
  numberRequiredMessage,
  PhaseValidationErrors,
  positiveNumberRequiredMessage,
  positiveNumbersAboveZeroErrorMessage,
} from './policy_validation';

const warmPhaseInitialization: WarmPhase = {
  phaseEnabled: false,
  warmPhaseOnRollover: false,
  selectedMinimumAge: '0',
  selectedMinimumAgeUnits: 'd',
  selectedNodeAttrs: '',
  selectedReplicaCount: '',
  shrinkEnabled: false,
  selectedPrimaryShardCount: '',
  forceMergeEnabled: false,
  selectedForceMergeSegments: '',
  phaseIndexPriority: '',
};

export const warmPhaseFromES = (phaseSerialized?: SerializedWarmPhase): WarmPhase => {
  const phase: WarmPhase = { ...warmPhaseInitialization };

  if (phaseSerialized === undefined || phaseSerialized === null) {
    return phase;
  }

  phase.phaseEnabled = true;

  if (phaseSerialized.min_age) {
    if (phaseSerialized.min_age === '0ms') {
      phase.warmPhaseOnRollover = true;
    } else {
      const { size: minAge, units: minAgeUnits } = splitSizeAndUnits(phaseSerialized.min_age);
      phase.selectedMinimumAge = minAge;
      phase.selectedMinimumAgeUnits = minAgeUnits;
    }
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

    if (actions.forcemerge) {
      const forcemerge = actions.forcemerge;
      phase.forceMergeEnabled = true;
      phase.selectedForceMergeSegments = forcemerge.max_num_segments.toString();
    }

    if (actions.shrink) {
      phase.shrinkEnabled = true;
      phase.selectedPrimaryShardCount = actions.shrink.number_of_shards
        ? actions.shrink.number_of_shards.toString()
        : '';
    }
  }
  return phase;
};

export const warmPhaseToES = (
  phase: WarmPhase,
  originalEsPhase?: SerializedWarmPhase
): SerializedWarmPhase => {
  if (!originalEsPhase) {
    originalEsPhase = { ...serializedPhaseInitialization };
  }

  const esPhase = { ...originalEsPhase };

  if (isNumber(phase.selectedMinimumAge)) {
    esPhase.min_age = `${phase.selectedMinimumAge}${phase.selectedMinimumAgeUnits}`;
  }

  // If warm phase on rollover is enabled, delete min age field
  // An index lifecycle switches to warm phase when rollover occurs, so you cannot specify a warm phase time
  // They are mutually exclusive
  if (phase.warmPhaseOnRollover) {
    // @ts-expect-error
    delete esPhase.min_age;
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

  if (phase.forceMergeEnabled) {
    esPhase.actions.forcemerge = {
      max_num_segments: parseInt(phase.selectedForceMergeSegments, 10),
    };
  } else {
    delete esPhase.actions.forcemerge;
  }

  if (phase.shrinkEnabled && isNumber(phase.selectedPrimaryShardCount)) {
    esPhase.actions.shrink = {
      number_of_shards: parseInt(phase.selectedPrimaryShardCount, 10),
    };
  } else {
    delete esPhase.actions.shrink;
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

export const validateWarmPhase = (phase: WarmPhase): PhaseValidationErrors<WarmPhase> => {
  if (!phase.phaseEnabled) {
    return {};
  }

  const phaseErrors = {} as PhaseValidationErrors<WarmPhase>;

  // index priority is optional, but if it's set, it needs to be a positive number
  if (phase.phaseIndexPriority) {
    if (!isNumber(phase.phaseIndexPriority)) {
      phaseErrors.phaseIndexPriority = [numberRequiredMessage];
    } else if (parseInt(phase.phaseIndexPriority, 10) < 0) {
      phaseErrors.phaseIndexPriority = [positiveNumberRequiredMessage];
    }
  }

  // if warm phase on rollover is disabled, min age needs to be a positive number
  if (!phase.warmPhaseOnRollover) {
    if (!isNumber(phase.selectedMinimumAge)) {
      phaseErrors.selectedMinimumAge = [numberRequiredMessage];
    } else if (parseInt(phase.selectedMinimumAge, 10) < 0) {
      phaseErrors.selectedMinimumAge = [positiveNumberRequiredMessage];
    }
  }

  // if forcemerge is enabled, force merge segments needs to be a number above zero
  if (phase.forceMergeEnabled) {
    if (!isNumber(phase.selectedForceMergeSegments)) {
      phaseErrors.selectedForceMergeSegments = [numberRequiredMessage];
    } else if (parseInt(phase.selectedForceMergeSegments, 10) < 1) {
      phaseErrors.selectedForceMergeSegments = [positiveNumbersAboveZeroErrorMessage];
    }
  }

  // if shrink is enabled, primary shard count needs to be a number above zero
  if (phase.shrinkEnabled) {
    if (!isNumber(phase.selectedPrimaryShardCount)) {
      phaseErrors.selectedPrimaryShardCount = [numberRequiredMessage];
    } else if (parseInt(phase.selectedPrimaryShardCount, 10) < 1) {
      phaseErrors.selectedPrimaryShardCount = [positiveNumbersAboveZeroErrorMessage];
    }
  }

  // replica count is optional, but if it's set, it needs to be a positive number
  if (phase.selectedReplicaCount) {
    if (!isNumber(phase.selectedReplicaCount)) {
      phaseErrors.selectedReplicaCount = [numberRequiredMessage];
    } else if (parseInt(phase.selectedReplicaCount, 10) < 0) {
      phaseErrors.selectedReplicaCount = [numberRequiredMessage];
    }
  }

  return {
    ...phaseErrors,
  };
};
