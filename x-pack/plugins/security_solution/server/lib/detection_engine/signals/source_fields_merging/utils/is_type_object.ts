/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import type { FieldsType } from '../types';

/**
 * Returns true if we match a "type" object which could be a geo-point when we are parsing field
 * values and we encounter a geo-point.
 * @param fieldsValue The value to test the shape of the data and see if it is a geo-point or not
 * @returns True if we match a geo-point or another type or not.
 */
export const isTypeObject = (fieldsValue: FieldsType): boolean => {
  return (fieldsValue as Array<string | number | boolean | object | null>).some((value) => {
    if (typeof value === 'object' && value != null) {
      return get('type', value);
    } else {
      return false;
    }
  });
};
