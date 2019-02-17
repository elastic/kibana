/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { transformMatrix3d } from '.';

// converts a transform matrix to a CSS string
export const matrixToCSS = (transformMatrix: transformMatrix3d): string =>
  transformMatrix ? 'matrix3d(' + transformMatrix.join(',') + ')' : 'translate3d(0,0,0)';

// converts to string, and adds `px` if non-zero
export const px = (value: number): string => (value === 0 ? '0' : value + 'px');
