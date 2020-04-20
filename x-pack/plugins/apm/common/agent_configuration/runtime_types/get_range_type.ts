/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isFinite } from 'lodash';

export function getRangeType(min?: number, max?: number) {
  if (isFinite(min) && isFinite(max)) {
    return 'between';
  } else if (isFinite(min)) {
    return 'gt'; // greater than
  } else if (isFinite(max)) {
    return 'lt'; // less than
  }
}
