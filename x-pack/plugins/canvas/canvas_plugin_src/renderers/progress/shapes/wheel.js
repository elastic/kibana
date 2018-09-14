/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const width = 200;
const height = width;

export const wheel = {
  name: 'wheel',
  displayName: 'Wheel',
  path: 'M 100 0 A 100 100 0 1 1 100 200 A 100 100 0 1 1 100 0 Z',
  width,
  height,
  getViewBox: weight => ({
    minX: -weight / 2,
    minY: -weight / 2,
    offsetWidth: width + weight,
    offsetHeight: height + weight,
  }),
};
