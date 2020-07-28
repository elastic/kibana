/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ValuesType } from 'utility-types';

// work around a TypeScript limitation described in https://stackoverflow.com/posts/49511416

export const arrayUnionToCallable = <T extends any[]>(
  array: T
): Array<ValuesType<T>> => {
  return array;
};
