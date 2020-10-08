/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isDestinationOrSource } from './types';

describe('types', () => {
  test('it returns that something is a source.ip type and value', () => {
    expect(isDestinationOrSource('source.ip')).toEqual(true);
  });

  test('it returns that something is a destination.ip type and value', () => {
    expect(isDestinationOrSource('destination.ip')).toEqual(true);
  });

  test('it returns that something else is not is a destination.ip type and value', () => {
    expect(isDestinationOrSource('something-else.ip')).toEqual(false);
  });

  test('it returns that null is not is a destination.ip type and value', () => {
    expect(isDestinationOrSource(null)).toEqual(false);
  });
});
