/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const resolvePathVariables = (
  path: string,
  variables: { [K: string]: string | number }
): string =>
  Object.keys(variables).reduce((acc, paramName) => {
    return acc.replace(new RegExp(`\{${paramName}\}`, 'g'), String(variables[paramName]));
  }, path);
