/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VALIDATION_STATUS } from '../constants/validation';

// get the most severe status level from a list of messages
const contains = (arr: string[], str: string) => arr.indexOf(str) >= 0;

export function getMostSevereMessageStatus(messages: Array<{ status: string }>): VALIDATION_STATUS {
  const statuses = messages.map(m => m.status);
  return [VALIDATION_STATUS.INFO, VALIDATION_STATUS.WARNING, VALIDATION_STATUS.ERROR].reduce(
    (previous, current) => {
      return contains(statuses, current) ? current : previous;
    },
    VALIDATION_STATUS.SUCCESS
  );
}

export function isValidJson(json: string) {
  if (json === null) {
    return false;
  }

  try {
    JSON.parse(json);
    return true;
  } catch (error) {
    return false;
  }
}
