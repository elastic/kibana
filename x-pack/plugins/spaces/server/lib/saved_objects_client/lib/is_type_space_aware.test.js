/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isTypeSpaceAware } from "./is_type_space_aware";

const knownSpaceAwareTypes = [
  'dashboard',
  'visualization',
  'saved_search',
  'timelion_sheet',
  'index_pattern'
];

const unwareTypes = ['space'];

knownSpaceAwareTypes.forEach(type => test(`${type} should be space-aware`, () => {
  expect(isTypeSpaceAware(type)).toBe(true);
}));

unwareTypes.forEach(type => test(`${type} should not be space-aware`, () => {
  expect(isTypeSpaceAware(type)).toBe(false);
}));

test(`unknown types should default to space-aware`, () => {
  expect(isTypeSpaceAware('an-unknown-type')).toBe(true);
});
