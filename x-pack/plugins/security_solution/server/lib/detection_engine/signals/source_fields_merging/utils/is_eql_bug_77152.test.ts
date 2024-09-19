/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqlBug77152 } from './is_eql_bug_77152';

/**
 * @deprecated Remove this test once https://github.com/elastic/elasticsearch/issues/77152 is fixed.
 */
describe('is_eql_bug_77152', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns true if it encounters the bug which is _ignored is returned in the fields', () => {
    expect(isEqlBug77152('_ignored')).toEqual(true);
  });

  it('returns false if it encounters a normal field', () => {
    expect(isEqlBug77152('some.field')).toEqual(false);
  });
});
