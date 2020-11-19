/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isObject } from 'lodash/fp';

export const parseValue = (
  value: string | number | object | undefined | null
): string | number | undefined | null => {
  if (isObject(value)) {
    return JSON.stringify(value);
  }
  return value as string | number | undefined | null;
};
