/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const attemptToDecodeURI = (value: string) => {
  let result: string;

  try {
    result = decodeURI(value);
    result = decodeURIComponent(result);
  } catch (e) {
    result = decodeURIComponent(value);
  }

  return result;
};
