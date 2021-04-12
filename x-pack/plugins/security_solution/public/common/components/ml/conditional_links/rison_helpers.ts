/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RisonValue, RisonObject, decode } from 'rison-node';
import { isObject, isString } from 'lodash/fp';

export const decodeRison = (value: string): RisonValue => {
  try {
    return decode(value);
  } catch (error) {
    return null;
  }
};

export const isRisonObject = (value: RisonValue): value is RisonObject => {
  return isObject(value);
};

export const isRegularString = (value: RisonValue): value is string => {
  return isString(value);
};
