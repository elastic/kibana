/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { basicJobValidation } from 'plugins/ml/../common/util/job_utils';
import { newJobLimits } from 'plugins/ml/jobs/new_job/utils/new_job_defaults';
import _ from 'lodash';

export function validateJob(job, checks) {
  const limits = newJobLimits();
  const validationResults = basicJobValidation(job, undefined, limits);

  let valid = true;

  _.each(checks, (item) => {
    item.valid = true;
  });

  if (validationResults.contains('job_id_empty')) {
    checks.jobId.valid = false;
  } else if (validationResults.contains('job_id_invalid')) {
    checks.jobId.valid = false;
    let msg = 'Job name can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; ';
    msg += 'must start and end with an alphanumeric character';
    checks.jobId.message = msg;
  }

  if (validationResults.contains('job_group_id_invalid')) {
    checks.groupIds.valid = false;
    let msg = 'Job group names can contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores; ';
    msg += 'must start and end with an alphanumeric character';
    checks.groupIds.message = msg;
  }

  if (validationResults.contains('model_memory_limit_invalid')) {
    checks.modelMemoryLimit.valid = false;
    const msg = `Model memory limit cannot be higher than the maximum value of ${limits.max_model_memory_limit.toUpperCase()}`;
    checks.modelMemoryLimit.message = msg;
  }

  if (validationResults.contains('detectors_duplicates')) {
    checks.duplicateDetectors.valid = false;
    const msg = 'Duplicate detectors were found.';
    checks.duplicateDetectors.message = msg;
  }

  _.each(checks, (item) => {
    if (item.valid === false) {
      valid = false;
    }
  });

  return valid;
}
