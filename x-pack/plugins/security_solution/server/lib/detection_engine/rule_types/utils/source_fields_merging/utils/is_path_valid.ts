/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isPlainObject } from 'lodash/fp';
import type { SignalSource } from '../../../types';

/**
 * Returns true if path in SignalSource object is valid
 * Path is valid if each field in hierarchy is object or undefined
 * Path is not valid if ANY of field in hierarchy is not object or undefined
 * @param path in source to check within source
 * @param source The source document
 * @returns boolean
 */
export const isPathValid = (path: string, source: SignalSource): boolean => {
  if (!path) {
    return false;
  }
  const splitPath = path.split('.');

  return splitPath.every((_, index, array) => {
    const newPath = [...array].splice(0, index + 1).join('.');
    const valueToCheck = get(newPath, source);
    return valueToCheck === undefined || isPlainObject(valueToCheck);
  });
};
