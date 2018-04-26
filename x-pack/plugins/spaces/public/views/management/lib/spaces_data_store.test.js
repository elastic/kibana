/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesDataStore } from './spaces_data_store';

const spaces = [{
  id: 1,
  name: 'foo',
  description: 'foo'
}, {
  id: 2,
  name: 'bar',
  description: 'bar'
}, {
  id: 3,
  name: 'sample text',
  description: 'some sample text'
}];

test(`it doesn't filter results with no search applied`, () => {
  const store = new SpacesDataStore(spaces);
  expect(store.getPage(0, 3)).toEqual(spaces);
});

test(`it filters results when search is applied`, () => {
  const store = new SpacesDataStore(spaces);
  const filteredResults = store.search('bar');

  expect(filteredResults).toEqual([spaces[1]]);

  expect(store.getPage(0, 3)).toEqual([spaces[1]]);
});

test(`it filters based on a partial match`, () => {
  const store = new SpacesDataStore(spaces);
  const filteredResults = store.search('mpl');

  expect(filteredResults).toEqual([spaces[2]]);

  expect(store.getPage(0, 3)).toEqual([spaces[2]]);
});
