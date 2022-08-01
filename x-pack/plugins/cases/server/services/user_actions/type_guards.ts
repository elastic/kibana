/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject, isString } from 'lodash';

export const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.every((val) => isString(val));
};

export const isObjectArray = (value: unknown): value is Array<Record<string, unknown>> => {
  return Array.isArray(value) && value.every((val) => isPlainObject(val));
};
