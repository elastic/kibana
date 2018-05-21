/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isReservedSpace } from './is_reserved_space';

test('it returns true for reserved spaces', () => {
  const space = {
    _reserved: true
  };

  expect(isReservedSpace(space)).toEqual(true);
});

test('it returns false for non-reserved spaces', () => {
  const space = {};

  expect(isReservedSpace(space)).toEqual(false);
});

test('it handles empty imput', () => {
  expect(isReservedSpace()).toEqual(false);
});
