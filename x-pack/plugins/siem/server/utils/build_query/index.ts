/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from './fields';
export * from './filters';
export * from './merge_fields_with_hits';

export const assertUnreachable = (
  x: never,
  message: string = 'Unknown Field in switch statement'
): never => {
  throw new Error(`${message} ${x}`);
};
