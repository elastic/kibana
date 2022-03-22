/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '../../../../../src/plugins/data_views/common';

import { isPopulatedObject } from '../shared_imports';

// Custom minimal type guard for DataView to check against the attributes used in transforms code.
export function isDataView(arg: any): arg is DataView {
  return (
    isPopulatedObject(arg, ['title', 'fields']) &&
    // `getComputedFields` is inherited, so it's not possible to
    // check with `hasOwnProperty` which is used by isPopulatedObject()
    'getComputedFields' in (arg as DataView) &&
    typeof (arg as DataView).getComputedFields === 'function' &&
    typeof arg.title === 'string' &&
    Array.isArray(arg.fields)
  );
}
