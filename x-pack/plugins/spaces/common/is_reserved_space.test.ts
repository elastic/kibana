/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isReservedSpace } from './is_reserved_space';
import type { Space } from './types';

test('it returns true for reserved spaces', () => {
  const space: Space = {
    id: '',
    name: '',
    disabledFeatures: [],
    _reserved: true,
  };

  expect(isReservedSpace(space)).toEqual(true);
});

test('it returns false for non-reserved spaces', () => {
  const space: Space = {
    id: '',
    name: '',
    disabledFeatures: [],
  };

  expect(isReservedSpace(space)).toEqual(false);
});

test('it handles empty input', () => {
  // @ts-ignore
  expect(isReservedSpace()).toEqual(false);
});
