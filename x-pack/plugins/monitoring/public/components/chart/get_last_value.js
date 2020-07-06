/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isNumber, get, last } from 'lodash';

/*
 * @param {Array/Number} data Data containing values to show in the horizontal legend
 * @return {Number/Null} Value to use from the given data
 */
export function getLastValue(data) {
  if (isNumber(data)) {
    return data;
  }
  if (!Array.isArray(data)) {
    return null;
  }

  const lastValue = get(last(data), '[1]');
  // check numeric to make sure 0 doesn't convert to null
  if (isNumber(lastValue)) {
    return lastValue;
  }

  // undefined/null return as null to show as N/A
  return null;
}
