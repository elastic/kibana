/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const csvToArray = (indices?: string | string[]): string[] | undefined => {
  return indices && Array.isArray(indices)
    ? indices
    : typeof indices === 'string'
    ? indices.split(',')
    : undefined;
};
