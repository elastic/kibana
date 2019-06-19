/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Mustache from 'mustache';
import { isPlainObject } from 'lodash';
import { AlertActionParams, State, Context } from '../types';

export function transformActionParams(params: AlertActionParams, state: State, context: Context) {
  const result: AlertActionParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (isPlainObject(value)) {
      result[key] = transformActionParams(value as AlertActionParams, state, context);
    } else if (typeof value !== 'string') {
      result[key] = value;
    } else {
      result[key] = Mustache.render(value, { context, state });
    }
  }
  return result;
}
