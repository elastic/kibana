/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNumber, isString } from 'lodash';

export const nanosToMicros = (nanosecondString: string): number => {
  if (!isString(nanosecondString)) {
    return isNumber(nanosecondString) ? nanosecondString / 1000 : 0;
  }

  try {
    const nanos = parseInt(nanosecondString, 10);
    return isNaN(nanos) ? 0 : nanos / 1000;
  } catch (err) {
    return 0;
  }
};
