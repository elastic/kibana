/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import moment from 'moment';

/*
 * For cleaner code: use these functions when a config schema value could be
 * one type or another.  This allows you to treat the value as one type.
 */

export const durationToNumber = (value: number | moment.Duration): number => {
  if (typeof value === 'number') {
    return value;
  }
  return value.asMilliseconds();
};

export const byteSizeValueToNumber = (value: number | ByteSizeValue) => {
  if (typeof value === 'number') {
    return value;
  }

  return value.getValueInBytes();
};
