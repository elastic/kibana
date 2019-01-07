/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';
import { getFunctionErrors } from '../../../../errors';
import ci from './ci.json';
import shirts from './shirts.json';

export function getDemoRows(arg) {
  if (arg === 'ci') {
    return cloneDeep(ci);
  }
  if (arg === 'shirts') {
    return cloneDeep(shirts);
  }

  const functionErrors = getFunctionErrors();
  throw functionErrors.getDemoRows.dataSetInvalid(arg);
}
