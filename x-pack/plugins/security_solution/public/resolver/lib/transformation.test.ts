/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { applyMatrix3 } from '../models/vector2';
import { scalingTransformation } from './transformation';

describe('transforms', () => {
  it('applying a scale matrix to a vector2 can invert the y value', () => {
    expect(applyMatrix3([1, 2], scalingTransformation([1, -1]))).toEqual([1, -2]);
  });
});
