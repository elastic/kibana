/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { basicJobValidation } from 'plugins/ml/../common/util/job_utils';
import { newJobLimits } from 'plugins/ml/jobs/new_job/utils/new_job_defaults';
import { ALLOWED_DATA_UNITS } from 'plugins/ml/../common/constants/validation';
import _ from 'lodash';
import { i18n } from '@kbn/i18n';

export function validateJob(job, checks) {
  const limits = newJobLimits();
  const validationResults = basicJobValidation(job, undefined, limits);

  let valid = true;

  _.each(checks, (item) => {
    item.valid = true;
  });

  populateValidationMessages(validationResults, checks);

  _.each(checks, (item) => {
    if (item.valid === false) {
      valid = false;
    }
  });

  return valid;
}

export function populateValidationMessages(validationResults, checks) {
  const limits = newJobLimits();

  if (validationResults.contains('job_id_empty')) {
    checks.jobId.valid = false;
  } else if (validationResults.contains('job_id_invalid')) {
    checks.jobId.valid = false;
    const msg = i18n.translate('xpack.ml.newJob.simple.validateJob.jobNameAllowedCharactersDescription', {
      defaultMessage: 'Job name can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; ' +
        'must start and end with an alphanumeric character'
    });
    checks.jobId.message = msg;
  }

  if (validationResults.contains('job_group_id_invalid')) {
    checks.groupIds.valid = false;
    const msg = i18n.translate('xpack.ml.newJob.simple.validateJob.jobGroupAllowedCharactersDescription', {
      defaultMessage: 'Job group names can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; ' +
        'must start and end with an alphanumeric character'
    });
    checks.groupIds.message = msg;
  }

  if (validationResults.contains('model_memory_limit_units_invalid')) {
    checks.modelMemoryLimit.valid = false;
    const str = `${(ALLOWED_DATA_UNITS.slice(0, ALLOWED_DATA_UNITS.length - 1).join(', '))} or ${([...ALLOWED_DATA_UNITS].pop())}`;
    const msg = i18n.translate('xpack.ml.newJob.simple.validateJob.modelMemoryLimitUnitsInvalidErrorMessage', {
      defaultMessage: 'Model memory limit data unit unrecognized. It must be {str}',
      values: { str }
    });
    checks.modelMemoryLimit.message = msg;
  }

  if (validationResults.contains('model_memory_limit_invalid')) {
    checks.modelMemoryLimit.valid = false;
    const msg = i18n.translate('xpack.ml.newJob.simple.validateJob.modelMemoryLimitRangeInvalidErrorMessage', {
      defaultMessage: 'Model memory limit cannot be higher than the maximum value of {maxModelMemoryLimit}',
      values: { maxModelMemoryLimit: limits.max_model_memory_limit.toUpperCase() }
    });
    checks.modelMemoryLimit.message = msg;
  }

  if (validationResults.contains('detectors_duplicates')) {
    checks.duplicateDetectors.valid = false;
    const msg = i18n.translate('xpack.ml.newJob.simple.validateJob.duplicatedDetectorsErrorMessage', {
      defaultMessage: 'Duplicate detectors were found.',
    });
    checks.duplicateDetectors.message = msg;
  }
}
