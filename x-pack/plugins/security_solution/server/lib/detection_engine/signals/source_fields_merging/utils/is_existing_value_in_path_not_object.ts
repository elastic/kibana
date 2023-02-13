/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isObjectLike } from 'lodash/fp';
import type { SignalSource } from '../../types';

/**
 * Returns true if any value within a path is not object and not undefined.
 * @param fieldsKey path in source to check within
 * @param source The source document
 * @returns true if we detect any of fields in path is primitive
 */
export const isExistingValueInPathNotObject = (
  fieldsKey: string,
  source: SignalSource
): boolean => {
  const splitPath = fieldsKey.split('.');
  splitPath.pop();
  return splitPath.some((_, index, array) => {
    const newPath = [...array].splice(0, index + 1).join('.');
    const valueToCheck = get(newPath, source);
    return !isObjectLike(valueToCheck) && valueToCheck !== undefined;
  });
};
