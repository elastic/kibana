/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TIME_UNITS } from '../constants';

export const getTimeUnitsLabel = (unit: string, size: number) => {
  const timeUnit = TIME_UNITS[unit];
  return size === 1 ? timeUnit.labelSingular : timeUnit.labelPlural;
};
