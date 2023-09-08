/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchTypes } from '../../../../../../../common/detection_engine/types';
import { isPrimitive } from './is_primitive';

/**
 * Returns true if this is an array and all elements of the array are primitives and not objects
 * @param valueInMergedDocument The search type to check if everything is primitive or not
 * @returns true if is an array and everything in the array is a primitive type
 */
export const isArrayOfPrimitives = (valueInMergedDocument: SearchTypes | null): boolean => {
  return (
    Array.isArray(valueInMergedDocument) &&
    valueInMergedDocument.every((value) => isPrimitive(value))
  );
};
