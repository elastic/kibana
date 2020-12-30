/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const attemptToURIDecode = (value: string) => {
  let result: string;

  try {
    result = decodeURI(value);
    result = decodeURIComponent(result);
  } catch (e1) {
    try {
      result = decodeURIComponent(value);
    } catch (e2) {
      result = value;
    }
  }

  return result;
};
