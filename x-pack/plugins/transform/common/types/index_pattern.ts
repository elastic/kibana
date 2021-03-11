/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexPattern } from '../../../../../src/plugins/data/common';

import { isPopulatedObject } from '../utils/object_utils';

// Custom minimal type guard for IndexPattern to check against the attributes used in transforms code.
export function isIndexPattern(arg: any): arg is IndexPattern {
  return (
    isPopulatedObject(arg) &&
    'getComputedFields' in arg &&
    typeof arg.getComputedFields === 'function' &&
    {}.hasOwnProperty.call(arg, 'title') &&
    typeof arg.title === 'string' &&
    {}.hasOwnProperty.call(arg, 'fields') &&
    Array.isArray(arg.fields)
  );
}
