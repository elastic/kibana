/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const width = 200;
const height = 1;
export const horizontalBar = {
  name: 'horizontalBar',
  displayName: 'Horizontal bar',
  path: 'M 0 1 L 200 1',
  width,
  height,
  getViewBox: weight => ({
    minX: 0,
    minY: -weight / 2,
    offsetWidth: width,
    offsetHeight: height + weight,
  }),
};
