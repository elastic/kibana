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
import { Policy, PolicyFromES } from './policies';

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

export interface ValidationErrors {
  hot: {
    selectedMaxAge: string[];
    selectedMaxAgeUnits: string[];
    selectedMaxSizeStored: string[];
    selectedMaxSizeStoredUnits: string[];
    selectedMaxDocuments: string[];
    phaseIndexPriority: string[];
  };
  warm: {
    selectedMinimumAge: string[];
    selectedMinimumAgeUnits: string[];
    selectedNodeAttrs: string[];
    selectedPrimaryShardCount: string[];
    selectedReplicaCount: string[];
    selectedForceMergeSegments: string[];
    phaseIndexPriority: string[];
  };
  cold: {
    selectedMinimumAge: string[];
    selectedMinimumAgeUnits: string[];
    selectedNodeAttrs: string[];
    selectedReplicaCount: string[];
    phaseIndexPriority: string[];
  };
  delete: {
    selectedMinimumAge: string[];
    selectedMinimumAgeUnits: string[];
  };
  policyName: string[];
}

export const validationErrorsInitialization: ValidationErrors = {
  hot: {
    selectedMaxAge: [],
    selectedMaxAgeUnits: [],
    selectedMaxSizeStored: [],
    selectedMaxSizeStoredUnits: [],
    selectedMaxDocuments: [],
    phaseIndexPriority: [],
  },
  warm: {
    selectedMinimumAge: [],
    selectedMinimumAgeUnits: [],
    selectedNodeAttrs: [],
    selectedPrimaryShardCount: [],
    selectedReplicaCount: [],
    selectedForceMergeSegments: [],
    phaseIndexPriority: [],
  },
  cold: {
    selectedMinimumAge: [],
    selectedMinimumAgeUnits: [],
    selectedNodeAttrs: [],
    selectedReplicaCount: [],
    phaseIndexPriority: [],
  },
  delete: {
    selectedMinimumAge: [],
    selectedMinimumAgeUnits: [],
  },
  policyName: [],
};

export const validatePolicy = (
  saveAsNew: boolean,
  policy: Policy,
  policies: PolicyFromES[],
  originalPolicyName: string
) => {
  let errors = { ...validationErrorsInitialization };
  if (!policy.name) {
    errors.policyName = [...errors.policyName, policyNameRequiredMessage];
  } else {
    if (policy.name.startsWith('_')) {
      errors.policyName = [...errors.policyName, policyNameStartsWithUnderscoreErrorMessage];
    }
    if (policy.name.includes(',')) {
      errors.policyName = [...errors.policyName, policyNameContainsCommaErrorMessage];
    }
    if (policy.name.includes(' ')) {
      errors.policyName = [...errors.policyName, policyNameContainsSpaceErrorMessage];
    }
    if (window.TextEncoder && new window.TextEncoder().encode(policy.name).length > 255) {
      errors.policyName = [...errors.policyName, policyNameTooLongErrorMessage];
    }

    if (saveAsNew && policy.name === originalPolicyName) {
      errors.policyName = [...errors.policyName, policyNameMustBeDifferentErrorMessage];
    } else if (policy.name !== originalPolicyName) {
      const policyNames = policies.map((existingPolicy) => existingPolicy.name);
      if (policyNames.includes(policy.name)) {
        errors.policyName = [...errors.policyName, policyNameAlreadyUsedErrorMessage];
      }
    }
  }

  errors = validateHotPhase(policy.phases.hot, errors);
  errors = validateWarmPhase(policy.phases.warm, errors);
  errors = validateColdPhase(policy.phases.cold, errors);
  errors = validateDeletePhase(policy.phases.delete, errors);
  return errors;
};
