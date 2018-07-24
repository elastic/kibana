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
} from 'plugins/ml/../common/util/job_utils';

export function validateModelMemoryLimit(mml) {
  const limits = newJobLimits();
  const tempJob = {
    analysis_limits: {
      model_memory_limit: mml
    }
  };
  const validationResults = validateModelMemoryLimitUtils(tempJob, limits);
  const { valid } = validationResults;

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
