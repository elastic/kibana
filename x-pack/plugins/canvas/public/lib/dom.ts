/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TransformMatrix3d } from './aeroelastic';

// converts a transform matrix to a CSS string
export const matrixToCSS = (transformMatrix: TransformMatrix3d): string =>
  transformMatrix ? 'matrix3d(' + transformMatrix.join(',') + ')' : 'translate3d(0,0,0)';
