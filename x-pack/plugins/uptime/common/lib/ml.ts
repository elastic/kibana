/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ML_JOB_ID } from '../constants';

export const getJobPrefix = (monitorId: string) => {
  // ML App doesn't support upper case characters in job name
  // Also Spaces and the characters / ? , " < > | * are not allowed
  // so we will replace all special chars with _

  const prefix = monitorId.replace(/[^A-Z0-9]+/gi, '_').toLowerCase();

  // ML Job ID can't be greater than 64 length, so will be substring it, and hope
  // At such big length, there is minimum chance of having duplicate monitor id
  // Subtracting ML_JOB_ID constant as well
  const postfix = '_' + ML_JOB_ID;

  if ((prefix + postfix).length > 64) {
    return prefix.substring(0, 64 - postfix.length) + '_';
  }
  return prefix + '_';
};

export const getMLJobId = (monitorId: string) => `${getJobPrefix(monitorId)}${ML_JOB_ID}`;
