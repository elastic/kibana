/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyPolicy, PolicyFromES, SerializedPolicy } from '../../../../common/types';

import {
  defaultNewColdPhase,
  defaultNewDeletePhase,
  defaultNewWarmPhase,
  serializedPhaseInitialization,
} from '../../constants';

import { warmPhaseFromES, warmPhaseToES } from './warm_phase';
import { coldPhaseFromES, coldPhaseToES } from './cold_phase';
import { deletePhaseFromES, deletePhaseToES } from './delete_phase';

export const splitSizeAndUnits = (field: string): { size: string; units: string } => {
  let size = '';
  let units = '';

  const result = /(\d+)(\w+)/.exec(field);
  if (result) {
    size = result[1];
    units = result[2];
  }

  return {
    size,
    units,
  };
};

export const isNumber = (value: any): boolean => value !== '' && value !== null && isFinite(value);

export const getPolicyByName = (
  policies: PolicyFromES[] | null | undefined,
  policyName: string = ''
): PolicyFromES | undefined => {
  if (policies && policies.length > 0) {
    return policies.find((policy: PolicyFromES) => policy.name === policyName);
  }
};

export const initializeNewPolicy = (newPolicyName: string = ''): LegacyPolicy => {
  return {
    name: newPolicyName,
    phases: {
      warm: { ...defaultNewWarmPhase },
      cold: { ...defaultNewColdPhase },
      delete: { ...defaultNewDeletePhase },
    },
  };
};

export const deserializePolicy = (policy: PolicyFromES): LegacyPolicy => {
  const {
    name,
    policy: { phases },
  } = policy;

  return {
    name,
    phases: {
      warm: warmPhaseFromES(phases.warm),
      cold: coldPhaseFromES(phases.cold),
      delete: deletePhaseFromES(phases.delete),
    },
  };
};

export const legacySerializePolicy = (
  policy: LegacyPolicy,
  originalEsPolicy: SerializedPolicy = {
    name: policy.name,
    phases: { hot: { ...serializedPhaseInitialization } },
  }
): SerializedPolicy => {
  const serializedPolicy = {
    name: policy.name,
    phases: {},
  } as SerializedPolicy;
  if (policy.phases.warm.phaseEnabled) {
    serializedPolicy.phases.warm = warmPhaseToES(policy.phases.warm, originalEsPolicy.phases.warm);
  }

  if (policy.phases.cold.phaseEnabled) {
    serializedPolicy.phases.cold = coldPhaseToES(policy.phases.cold, originalEsPolicy.phases.cold);
  }

  if (policy.phases.delete.phaseEnabled) {
    serializedPolicy.phases.delete = deletePhaseToES(
      policy.phases.delete,
      originalEsPolicy.phases.delete
    );
  }
  return serializedPolicy;
};
