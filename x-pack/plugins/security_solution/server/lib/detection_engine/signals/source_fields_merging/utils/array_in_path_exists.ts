/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import { SignalSource } from '../../types';

/**
 * Returns true if an array within the path exists anywhere.
 * @param fieldsKey The fields key to check if an array exists along the path
 * @param source The source document to check for an array anywhere along the path
 * @returns true if we detect an array along the path, otherwise false
 */
export const arrayInPathExists = (fieldsKey: string, source: SignalSource): boolean => {
  const splitPath = fieldsKey.split('.');
  return splitPath.some((_, index, array) => {
    const newPath = [...array].splice(0, index + 1).join('.');
    return Array.isArray(get(newPath, source));
  });
};
