/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { msToPretty } from './ms_to_pretty';

export function nsToPretty(ns, precision) {
  if (!precision) {
    precision = 1;
  }
  const units = ['ns', 'µs'];
  for (const i in units) {
    if (ns < 1000) {
      return ns.toFixed(precision) + units[i];
    }
    ns /= 1000;
  }
  return msToPretty(ns, precision);
}