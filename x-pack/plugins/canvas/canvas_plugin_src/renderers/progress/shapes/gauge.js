/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const width = 200;
const height = 166;

export const gauge = {
  name: 'gauge',
  displayName: 'Gauge',
  path: 'M 25 166 A 100 100 0 1 1 175 166',
  width,
  height,
  getViewBox: weight => ({
    minX: -weight / 2,
    minY: -weight / 2,
    offsetWidth: width + weight,
    offsetHeight: height + (weight * 66) / 76,
  }),
};
