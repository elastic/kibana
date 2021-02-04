/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SlmPolicyPayload } from '../../../../common/types';
import { textService } from '../text';

export interface PolicyValidation {
  isValid: boolean;
  errors: { [key: string]: React.ReactNode[] };
}

const isStringEmpty = (str: string | null): boolean => {
  return str ? !Boolean(str.trim()) : true;
};

// strExcludeDate is the concat results of the SnapshotName ...{...}>... without the date
// This way we can check only the SnapshotName portion for lowercasing
// For example: <logstash-{now/d}> would give strExcludeDate = <logstash->

const isSnapshotNameNotLowerCase = (str: string): boolean => {
  const strExcludeDate =
    str.substring(0, str.search('{')) + str.substring(str.search('}>') + 1, str.length);
  return strExcludeDate !== strExcludeDate.toLowerCase() ? true : false;
};

export interface ValidatePolicyHelperData {
  managedRepository?: {
    name: string;
    policy: string;
  };
  isEditing?: boolean;
  policyName?: string;
  /**
   * Whether to block on the indices configured for this snapshot.
   *
   * By default ES will back up all indices and data streams if this is an empty array or left blank.
   * However, in the UI, under certain conditions, like when displaying indices to select for backup,
   * we want to block users from submitting an empty array, but not block the entire form if they
   * are not configuring this value - like when they are on a previous step.
   */
  validateIndicesCount?: boolean;

  /**
   * A policy might be configured with a repository that no longer exists. We want the form to
   * block in this case because just having a repository configured is not enough for validity.
   */
  repositoryDoesNotExist?: boolean;
}

export const validatePolicy = (
  policy: SlmPolicyPayload,
  validationHelperData: ValidatePolicyHelperData
): PolicyValidation => {
  const i18n = textService.i18n;

  const { name, snapshotName, schedule, repository, config, retention } = policy;
  const {
    managedRepository,
    isEditing,
    policyName,
    validateIndicesCount,
    repositoryDoesNotExist,
  } = validationHelperData;

  const validation: PolicyValidation = {
    isValid: true,
    errors: {
      name: [],
      snapshotName: [],
      schedule: [],
      repository: [],
      dataStreams: [],
      indices: [],
      expireAfterValue: [],
      minCount: [],
      maxCount: [],
    },
  };

  if (isStringEmpty(name)) {
    validation.errors.name.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.nameRequiredErroMessage', {
        defaultMessage: 'Policy name is required.',
      })
    );
  }

  if (isStringEmpty(snapshotName)) {
    validation.errors.snapshotName.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.snapshotNameRequiredErrorMessage', {
        defaultMessage: 'Snapshot name is required.',
      })
    );
  }

  if (isSnapshotNameNotLowerCase(snapshotName)) {
    validation.errors.snapshotName.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.snapshotNameLowerCaseErrorMessage', {
        defaultMessage: 'Snapshot name needs to be lowercase.',
      })
    );
  }

  if (isStringEmpty(schedule)) {
    validation.errors.schedule.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.scheduleRequiredErrorMessage', {
        defaultMessage: 'Schedule is required.',
      })
    );
  }

  if (isStringEmpty(repository) || repositoryDoesNotExist) {
    validation.errors.repository.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.repositoryRequiredErrorMessage', {
        defaultMessage: 'Repository is required.',
      })
    );
  }

  if (
    validateIndicesCount &&
    config &&
    typeof config.indices === 'string' &&
    config.indices.trim().length === 0
  ) {
    validation.errors.indices.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.indexPatternRequiredErrorMessage', {
        defaultMessage: 'At least one index pattern is required.',
      })
    );
  }

  if (
    validateIndicesCount &&
    config &&
    Array.isArray(config.indices) &&
    config.indices.length === 0
  ) {
    validation.errors.indices.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.indicesRequiredErrorMessage', {
        defaultMessage: 'You must select at least one data stream or index.',
      })
    );
  }

  if (
    retention &&
    retention.minCount &&
    retention.maxCount &&
    retention.minCount > retention.maxCount
  ) {
    validation.errors.minCount.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.invalidMinCountErrorMessage', {
        defaultMessage: 'Minimum count cannot be greater than maximum count.',
      })
    );
  }

  if (
    managedRepository &&
    managedRepository.name === repository &&
    managedRepository.policy &&
    !(isEditing && managedRepository.policy === policyName)
  ) {
    validation.errors.repository.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.invalidRepoErrorMessage', {
        defaultMessage: 'Policy "{policyName}" is already associated with this repository.',
        values: {
          policyName: managedRepository.policy,
        },
      })
    );
  }

  if (retention && retention.expireAfterValue && retention.expireAfterValue < 0) {
    validation.errors.expireAfterValue.push(
      i18n.translate(
        'xpack.snapshotRestore.policyValidation.invalidNegativeDeleteAfterErrorMessage',
        {
          defaultMessage: 'Delete after cannot be negative.',
        }
      )
    );
  }

  if (retention && retention.minCount && retention.minCount < 0) {
    validation.errors.minCount.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.invalidNegativeMinCountErrorMessage', {
        defaultMessage: 'Minimum count cannot be negative.',
      })
    );
  }

  if (retention && retention.maxCount && retention.maxCount < 0) {
    validation.errors.maxCount.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.invalidNegativeMaxCountErrorMessage', {
        defaultMessage: 'Maximum count cannot be negative.',
      })
    );
  }

  // Remove fields with no errors
  validation.errors = Object.entries(validation.errors)
    .filter(([key, value]) => value.length > 0)
    .reduce((errs: PolicyValidation['errors'], [key, value]) => {
      errs[key] = value;
      return errs;
    }, {});

  // Set overall validations status
  if (Object.keys(validation.errors).length > 0) {
    validation.isValid = false;
  }

  return validation;
};
