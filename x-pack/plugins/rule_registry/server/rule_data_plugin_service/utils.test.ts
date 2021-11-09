/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { incrementIndexName } from './utils';

describe('incrementIndexName', () => {
  it('should increment 000001 to 000002', () => {
    const oldIndex = '.alerts-mock-000001';
    const newIndex = incrementIndexName(oldIndex);
    expect(newIndex).toEqual('.alerts-mock-000002');
  });

  it('should increment 000010 to 000011', () => {
    const oldIndex = '.alerts-mock-000010';
    const newIndex = incrementIndexName(oldIndex);
    expect(newIndex).toEqual('.alerts-mock-000011');
  });

  it('should return undefined if oldIndex does not end in a number', () => {
    const oldIndex = '.alerts-mock-string';
    const newIndex = incrementIndexName(oldIndex);
    expect(newIndex).toEqual(undefined);
  });
});
