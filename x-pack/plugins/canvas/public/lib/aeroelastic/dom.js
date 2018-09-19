/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// converts a transform matrix to a CSS string
const matrixToCSS = transformMatrix =>
  transformMatrix ? 'matrix3d(' + transformMatrix.join(',') + ')' : 'translate3d(0,0,0)';

// converts to string, and adds `px` if non-zero
const px = value => (value === 0 ? '0' : value + 'px');

module.exports = {
  matrixToCSS,
  px,
};
