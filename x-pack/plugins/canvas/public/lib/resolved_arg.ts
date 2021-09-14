/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

export function getState(resolvedArg?: any): any {
  return get(resolvedArg, 'state', null);
}

export function getValue(resolvedArg?: any): any {
  return get(resolvedArg, 'value', null);
}

export function getError(resolvedArg?: any): any {
  if (getState(resolvedArg) !== 'error') {
    return null;
  }
  return get(resolvedArg, 'error', null);
}
