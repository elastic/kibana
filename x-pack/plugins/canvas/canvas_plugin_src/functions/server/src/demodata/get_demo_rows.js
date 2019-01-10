/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';
import ci from './ci.json';
import shirts from './shirts.json';

export function getDemoRows(arg) {
  if (arg === 'ci') {
    return cloneDeep(ci);
  }
  if (arg === 'shirts') {
    return cloneDeep(shirts);
  }
  throw new Error(`Invalid data set: '${arg}', use 'ci' or 'shirts'.`);
}
