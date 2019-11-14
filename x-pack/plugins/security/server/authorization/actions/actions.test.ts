/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Actions } from '.';

describe('#constructor', () => {
  test(`doesn't allow an empty string`, () => {
    expect(() => new Actions('')).toThrowErrorMatchingInlineSnapshot(
      `"version can't be an empty string"`
    );
  });
});

describe('#login', () => {
  test('returns login:', () => {
    const actions = new Actions('mock-version');

    expect(actions.login).toBe('login:');
  });
});

describe('#version', () => {
  test("returns `version:${config.get('pkg.version')}`", () => {
    const version = 'mock-version';
    const actions = new Actions(version);

    expect(actions.version).toBe(`version:${version}`);
  });
});
