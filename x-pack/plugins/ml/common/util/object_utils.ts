/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

/**
 * Get the first key in the object
 * getFirstKeyInObject({ firstKey: {}, secondKey: {}}) -> firstKey
 */
export const getFirstKeyInObject = (arg: unknown): string | undefined => {
  if (isPopulatedObject(arg)) {
    const keys = Object.keys(arg);
    return keys.length > 0 ? keys[0] : undefined;
  }
};
