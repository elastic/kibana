/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { newJobLimits } from 'plugins/ml/jobs/new_job/utils/new_job_defaults';
import { populateValidationMessages } from 'plugins/ml/jobs/new_job/simple/components/utils/validate_job';

import {
  validateModelMemoryLimit as validateModelMemoryLimitUtils,
  validateGroupNames as validateGroupNamesUtils,
  validateModelMemoryLimitUnits as validateModelMemoryLimitUnitsUtils,
} from 'plugins/ml/../common/util/job_utils';

export function validateModelMemoryLimit(mml) {
  const limits = newJobLimits();
  const tempJob = {
    analysis_limits: {
      model_memory_limit: mml
    }
  };

  let validationResults = validateModelMemoryLimitUnitsUtils(tempJob);
  let { valid } = validationResults;

  if(valid) {
    validationResults = validateModelMemoryLimitUtils(tempJob, limits);
    valid = validationResults.valid;
  }

  const modelMemoryLimit = {
    valid,
    message: '',
  };

  populateValidationMessages(validationResults, { modelMemoryLimit });

  return modelMemoryLimit;
}

export function validateGroupNames(groups) {
  const tempJob = {
    groups
  };

  const validationResults = validateGroupNamesUtils(tempJob);
  const { valid } = validationResults;

  const groupIds = {
    valid,
    message: '',
  };

  populateValidationMessages(validationResults, { groupIds });

  return groupIds;
}
