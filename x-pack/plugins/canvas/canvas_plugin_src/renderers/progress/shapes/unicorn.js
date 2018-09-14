/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const width = 200;
const height = width;

export const unicorn = {
  name: 'unicorn',
  displayName: 'Unicorn',
  path:
    'M 123 189 C 93 141 129 126 102 96 L 78 102 L 48 117 L 42 129 Q 30 132 21 126 L 18 114 L 27 90 L 42 72 L 48 57 L 3 6 L 57 42 L 63 33 L 60 15 L 69 27 L 69 15 L 84 27 Q 162 36 195 108 Q 174 159 123 189 Z',
  width: 200,
  height: 200,
  getViewBox: weight => ({
    minX: -weight / 2,
    minY: -weight / 2,
    offsetWidth: width + weight,
    offsetHeight: height + weight,
  }),
};
