/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const stringifyJson = (json: any): string =>
  Array.isArray(json) ? JSON.stringify(json, null, 2) : '[\n\n]';

export const parseJson = (jsonString: string): object[] => {
  let parsedJSON: any;

  try {
    parsedJSON = JSON.parse(jsonString);

    if (!Array.isArray(parsedJSON)) {
      // Convert object to array
      parsedJSON = [parsedJSON];
    }
  } catch {
    parsedJSON = [];
  }

  return parsedJSON;
};
