/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getActionFilterLabel } from './hooks';

describe('#getActionFilterLabel', () => {
  it.each([
    ['isolate', 'Isolate'],
    ['unisolate', 'Release'],
    ['kill-process', 'Kill process'],
    ['suspend-process', 'Suspend process'],
    ['running-processes', 'Running processes'],
  ])('should transform %s to %s', (action, label) => {
    expect(getActionFilterLabel(action)).toEqual(label);
  });
});
