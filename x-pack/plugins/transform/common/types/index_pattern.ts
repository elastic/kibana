/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexPattern } from '../../../../../src/plugins/data/common';

import { isPopulatedObject } from '../shared_imports';

// Custom minimal type guard for IndexPattern to check against the attributes used in transforms code.
export function isIndexPattern(arg: any): arg is IndexPattern {
  return (
    isPopulatedObject(arg, ['title', 'fields']) &&
    // `getComputedFields` is inherited, so it's not possible to
    // check with `hasOwnProperty` which is used by isPopulatedObject()
    'getComputedFields' in (arg as IndexPattern) &&
    typeof (arg as IndexPattern).getComputedFields === 'function' &&
    typeof arg.title === 'string' &&
    Array.isArray(arg.fields)
  );
}
