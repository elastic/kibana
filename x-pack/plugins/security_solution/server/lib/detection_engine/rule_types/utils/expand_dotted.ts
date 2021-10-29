/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from '@kbn/std';

const expandDottedField = (dottedFieldName: string, val: unknown): object => {
  const parts = dottedFieldName.split('.');
  if (parts.length === 1) {
    return { [parts[0]]: val };
  } else {
    return { [parts[0]]: expandDottedField(parts.slice(1).join('.'), val) };
  }
};

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
export const expandDottedObject = (dottedObj: object) => {
  return Object.entries(dottedObj).reduce(
    (acc, [key, val]) => merge(acc, expandDottedField(key, val)),
    {}
  );
};
