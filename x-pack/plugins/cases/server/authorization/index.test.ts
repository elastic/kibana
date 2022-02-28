/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isWriteOperation, Operations } from '.';
import { OperationDetails } from './types';

describe('index tests', () => {
  it('should identify a write operation', () => {
    expect(isWriteOperation(Operations.createCase)).toBeTruthy();
  });

  it('should return false when the operation is not a write operation', () => {
    expect(isWriteOperation(Operations.getCase)).toBeFalsy();
  });

  it('should not identify an invalid operation as a write operation', () => {
    expect(isWriteOperation({ name: 'blah' } as unknown as OperationDetails)).toBeFalsy();
  });
});
