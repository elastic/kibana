/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const stringifyJson = (json: any, renderAsArray: boolean = true): string =>
  (renderAsArray && Array.isArray(json)) ||
  (!renderAsArray && json && typeof json === 'object' && !Array.isArray(json))
    ? JSON.stringify(json, null, 2)
    : renderAsArray
      ? '[\n\n]'
      : '{\n\n}';

export const parseJson = (jsonString: string, renderAsArray: boolean = true): object[] => {
  let parsedJSON: any;

  try {
    parsedJSON = JSON.parse(jsonString);

    if (renderAsArray && !Array.isArray(parsedJSON)) {
      // Convert object to array
      parsedJSON = [parsedJSON];
    }
  } catch {
    parsedJSON = renderAsArray ? [] : {};
  }

  return parsedJSON;
};
