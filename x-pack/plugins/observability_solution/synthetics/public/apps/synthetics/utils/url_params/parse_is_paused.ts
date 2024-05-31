/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: add a comment explaining the purpose of this function
export const parseIsPaused = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return defaultValue;
};
