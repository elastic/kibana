/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineFiltersAndUserSearch } from './combine_filters_and_user_search';

describe('combineFiltersAndUserSearch', () => {
  it('returns only search if filters are empty', () => {
    expect(combineFiltersAndUserSearch('', 'monitor.id:foo')).toEqual('monitor.id:foo');
  });

  it('returns only filters if search is empty', () => {
    expect(combineFiltersAndUserSearch('monitor.id:foo', '')).toEqual('monitor.id:foo');
  });

  it('returns merged filters and user search if neither is empty', () => {
    expect(combineFiltersAndUserSearch('monitor.id:foo', 'monitor.name:bar')).toEqual(
      '(monitor.id:foo) and (monitor.name:bar)'
    );
  });
});
