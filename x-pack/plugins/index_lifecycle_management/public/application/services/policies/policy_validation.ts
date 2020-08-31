/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { validateHotPhase } from './hot_phase';
import { validateWarmPhase } from './warm_phase';
import { validateColdPhase } from './cold_phase';
import { validateDeletePhase } from './delete_phase';
import { validateFrozenPhase } from './frozen_phase';

import {
  ColdPhase,
  DeletePhase,
  FrozenPhase,
  HotPhase,
  Policy,
  PolicyFromES,
  WarmPhase,
} from './types';

export const propertyof = <T>(propertyName: keyof T & string) => propertyName;

export const numberRequiredMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.numberRequiredError',
  {
    defaultMessage: 'A number is required.',
  }
);

// TODO validation includes 0 -> should be non-negative number?
export const positiveNumberRequiredMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.positiveNumberRequiredError',
  {
    defaultMessage: 'Only positive numbers are allowed.',
  }
);

export const maximumAgeRequiredMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.maximumAgeMissingError',
  {
    defaultMessage: 'A maximum age is required.',
  }
);

export const maximumSizeRequiredMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.maximumIndexSizeMissingError',
  {
    defaultMessage: 'A maximum index size is required.',
  }
);

export const maximumDocumentsRequiredMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.maximumDocumentsMissingError',
  {
    defaultMessage: 'Maximum documents is required.',
  }
);

export const positiveNumbersAboveZeroErrorMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.positiveNumberAboveZeroRequiredError',
  {
    defaultMessage: 'Only numbers above 0 are allowed.',
  }
);

export const policyNameRequiredMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.policyNameRequiredError',
  {
    defaultMessage: 'A policy name is required.',
  }
);

export const policyNameStartsWithUnderscoreErrorMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.policyNameStartsWithUnderscoreError',
  {
    defaultMessage: 'A policy name cannot start with an underscore.',
  }
);
export const policyNameContainsCommaErrorMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.policyNameContainsCommaError',
  {
    defaultMessage: 'A policy name cannot include a comma.',
  }
);
export const policyNameContainsSpaceErrorMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.policyNameContainsSpaceError',
  {
    defaultMessage: 'A policy name cannot include a space.',
  }
);

export const policyNameTooLongErrorMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.policyNameTooLongError',
  {
    defaultMessage: 'A policy name cannot be longer than 255 bytes.',
  }
);
export const policyNameMustBeDifferentErrorMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.differentPolicyNameRequiredError',
  {
    defaultMessage: 'The policy name must be different.',
  }
);
export const policyNameAlreadyUsedErrorMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.policyNameAlreadyUsedError',
  {
    defaultMessage: 'That policy name is already used.',
  }
);
export type PhaseValidationErrors<T> = {
  [P in keyof Partial<T>]: string[];
};

export interface ValidationErrors {
  hot: PhaseValidationErrors<HotPhase>;
  warm: PhaseValidationErrors<WarmPhase>;
  cold: PhaseValidationErrors<ColdPhase>;
  frozen: PhaseValidationErrors<FrozenPhase>;
  delete: PhaseValidationErrors<DeletePhase>;
  policyName: string[];
}

export const validatePolicy = (
  saveAsNew: boolean,
  policy: Policy,
  policies: PolicyFromES[],
  originalPolicyName: string
): [boolean, ValidationErrors] => {
  const policyNameErrors: string[] = [];
  if (!policy.name) {
    policyNameErrors.push(policyNameRequiredMessage);
  } else {
    if (policy.name.startsWith('_')) {
      policyNameErrors.push(policyNameStartsWithUnderscoreErrorMessage);
    }
    if (policy.name.includes(',')) {
      policyNameErrors.push(policyNameContainsCommaErrorMessage);
    }
    if (policy.name.includes(' ')) {
      policyNameErrors.push(policyNameContainsSpaceErrorMessage);
    }
    if (window.TextEncoder && new window.TextEncoder().encode(policy.name).length > 255) {
      policyNameErrors.push(policyNameTooLongErrorMessage);
    }

    if (saveAsNew && policy.name === originalPolicyName) {
      policyNameErrors.push(policyNameMustBeDifferentErrorMessage);
    } else if (policy.name !== originalPolicyName) {
      const policyNames = policies.map((existingPolicy) => existingPolicy.name);
      if (policyNames.includes(policy.name)) {
        policyNameErrors.push(policyNameAlreadyUsedErrorMessage);
      }
    }
  }

  const hotPhaseErrors = validateHotPhase(policy.phases.hot);
  const warmPhaseErrors = validateWarmPhase(policy.phases.warm);
  const coldPhaseErrors = validateColdPhase(policy.phases.cold);
  const frozenPhaseErrors = validateFrozenPhase(policy.phases.frozen);
  const deletePhaseErrors = validateDeletePhase(policy.phases.delete);
  const isValid =
    policyNameErrors.length === 0 &&
    Object.keys(hotPhaseErrors).length === 0 &&
    Object.keys(warmPhaseErrors).length === 0 &&
    Object.keys(coldPhaseErrors).length === 0 &&
    Object.keys(frozenPhaseErrors).length === 0 &&
    Object.keys(deletePhaseErrors).length === 0;
  return [
    isValid,
    {
      policyName: [...policyNameErrors],
      hot: hotPhaseErrors,
      warm: warmPhaseErrors,
      cold: coldPhaseErrors,
      frozen: frozenPhaseErrors,
      delete: deletePhaseErrors,
    },
  ];
};

export const findFirstError = (errors?: ValidationErrors): string | undefined => {
  if (!errors) {
    return;
  }

  if (errors.policyName.length > 0) {
    return propertyof<ValidationErrors>('policyName');
  }

  if (Object.keys(errors.hot).length > 0) {
    return `${propertyof<ValidationErrors>('hot')}.${Object.keys(errors.hot)[0]}`;
  }
  if (Object.keys(errors.warm).length > 0) {
    return `${propertyof<ValidationErrors>('warm')}.${Object.keys(errors.warm)[0]}`;
  }
  if (Object.keys(errors.cold).length > 0) {
    return `${propertyof<ValidationErrors>('cold')}.${Object.keys(errors.cold)[0]}`;
  }
  if (Object.keys(errors.delete).length > 0) {
    return `${propertyof<ValidationErrors>('delete')}.${Object.keys(errors.delete)[0]}`;
  }
};
