/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { indicesExistOrDataTemporarilyUnavailable } from './format';

describe('indicesExistOrDataTemporarilyUnavailable', () => {
  it('it returns true when undefined', () => {
    let undefVar;
    const result = indicesExistOrDataTemporarilyUnavailable(undefVar);
    expect(result).toBeTruthy();
  });
  it('it returns true when true', () => {
    const result = indicesExistOrDataTemporarilyUnavailable(true);
    expect(result).toBeTruthy();
  });
  it('it returns false when false', () => {
    const result = indicesExistOrDataTemporarilyUnavailable(false);
    expect(result).toBeFalsy();
  });
});
