/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppActions } from './app';

const version = '1.0.0-zeta1';

describe('#all', () => {
  test('returns `app:${version}:*`', () => {
    const appActions = new AppActions(version);
    expect(appActions.all).toBe('app:1.0.0-zeta1:*');
  });
});

describe('#get', () => {
  [null, undefined, '', 1, true, {}].forEach((appid: any) => {
    test(`appId of ${JSON.stringify(appid)} throws error`, () => {
      const appActions = new AppActions(version);
      expect(() => appActions.get(appid)).toThrowErrorMatchingSnapshot();
    });
  });

  test('returns `app:${version}:${appId}`', () => {
    const appActions = new AppActions(version);
    expect(appActions.get('foo-app')).toBe('app:1.0.0-zeta1:foo-app');
  });
});
