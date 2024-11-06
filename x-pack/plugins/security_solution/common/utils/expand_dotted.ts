/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge, setWith } from 'lodash';

/*
 * Expands an object with "dotted" fields to a nested object with unflattened fields.
 *
 * Example:
 *   expandDottedObject({
 *     "kibana.alert.depth": 1,
 *     "kibana.alert.ancestors": [{
 *       id: "d5e8eb51-a6a0-456d-8a15-4b79bfec3d71",
 *       type: "event",
 *       index: "signal_index",
 *       depth: 0,
 *     }],
 *   })
 *
 *   => {
 *     kibana: {
 *       alert: {
 *         ancestors: [
 *           id: "d5e8eb51-a6a0-456d-8a15-4b79bfec3d71",
 *           type: "event",
 *           index: "signal_index",
 *           depth: 0,
 *         ],
 *         depth: 1,
 *       },
 *     },
 *   }
 */
export const expandDottedObject = (
  dottedObj: object,
  changeArrayOfLengthOneToString = false
): object => {
  if (Array.isArray(dottedObj)) {
    return dottedObj;
  }
  const returnObj = {};
  Object.entries(dottedObj).forEach(([key, value]) => {
    const isOneElementArray =
      changeArrayOfLengthOneToString && Array.isArray(value) && value.length === 1;

    merge(returnObj, setWith({}, key, isOneElementArray ? value[0] : value, Object));
  });
  return returnObj;
};
