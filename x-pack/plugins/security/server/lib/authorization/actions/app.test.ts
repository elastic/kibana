/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppActions } from './app';

describe('#all', () => {
  test(`returns app:*`, () => {
    const appActions = new AppActions();
    expect(appActions.all).toBe('app:*');
  });
});

describe('#get', () => {
  [null, undefined, '', 1, true, {}].forEach((appid: any) => {
    test(`appId of ${JSON.stringify(appid)} throws error`, () => {
      const appActions = new AppActions();
      expect(() => appActions.get(appid)).toThrowErrorMatchingSnapshot();
    });
  });

  test('returns `app:${appId}`', () => {
    const appActions = new AppActions();
    expect(appActions.get('foo-app')).toBe('app:foo-app');
  });
});
