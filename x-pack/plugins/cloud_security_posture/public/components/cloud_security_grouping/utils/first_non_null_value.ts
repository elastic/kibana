/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ECSField } from '@kbn/securitysolution-grouping/src';

/**
 * Return first non-null value. If the field contains an array, this will return the first value that isn't null. If the field isn't an array it'll be returned unless it's null.
 */
export function firstNonNullValue<T>(valueOrCollection: ECSField<T>): T | undefined {
  if (valueOrCollection === null) {
    return undefined;
  } else if (Array.isArray(valueOrCollection)) {
    for (const value of valueOrCollection) {
      if (value !== null) {
        return value;
      }
    }
  } else {
    return valueOrCollection;
  }
}
