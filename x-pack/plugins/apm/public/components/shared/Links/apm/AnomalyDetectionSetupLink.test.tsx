/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { environmentIncludes } from './AnomalyDetectionSetupLink';

describe('#environmentIncludes', () => {
  it('should return true if current environment is an element of the given environment list', () => {
    const result = environmentIncludes(['staging', 'production'], 'staging');
    expect(result).toBe(true);
  });
  it('should return false if there is no current environment and the environment list is empty', () => {
    const result = environmentIncludes([], undefined);
    expect(result).toBe(false);
  });
  it('should return false if current environment is not an element of the given environment list', () => {
    const result = environmentIncludes(['staging', 'production'], 'testing');
    expect(result).toBe(false);
  });
  it('should return true if there is no current environment and the environment list has items', () => {
    const result = environmentIncludes(['staging', 'production'], undefined);
    expect(result).toBe(true);
  });
  it('should return false if there is a current environment and the environment list is empty', () => {
    const result = environmentIncludes([], 'testing');
    expect(result).toBe(false);
  });
});
