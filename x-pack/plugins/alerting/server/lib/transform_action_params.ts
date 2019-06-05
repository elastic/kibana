/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Handlebars from 'handlebars';
import { isPlainObject } from 'lodash';
import { AlertActionParams, State, Context } from '../types';

export function transformActionParams(params: AlertActionParams, state: State, context: Context) {
  const result: AlertActionParams = {};
  for (const key of Object.keys(params)) {
    const value = params[key];
    if (isPlainObject(value)) {
      result[key] = transformActionParams(value, state, context);
      continue;
    }
    if (typeof value !== 'string') {
      result[key] = value;
      continue;
    }
    const template = Handlebars.compile(value);
    result[key] = template({ context, state });
  }
  return result;
}
