/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const width = 1;
const height = 200;

export const verticalBar = {
  name: 'verticalBar',
  displayName: 'Vertical bar',
  path: 'M 1 200 L 1 0 ',
  width,
  height,
  getViewBox: weight => ({
    minX: -weight / 2,
    minY: 0,
    offsetWidth: width + weight,
    offsetHeight: height,
  }),
};
