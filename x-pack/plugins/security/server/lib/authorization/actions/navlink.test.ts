/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NavlinkActions } from './navlink';

describe('#all', () => {
  test(`returns navlink:*`, () => {
    const navlinkActions = new NavlinkActions();
    expect(navlinkActions.all).toBe('navlink:*');
  });
});

describe('#get', () => {
  [null, undefined, '', 1, true, {}].forEach((navlinkId: any) => {
    test(`navlinkId of ${JSON.stringify(navlinkId)} throws error`, () => {
      const navlinkActions = new NavlinkActions();
      expect(() => navlinkActions.get(navlinkId)).toThrowErrorMatchingSnapshot();
    });
  });

  test('returns `navlink:${navlinkId}`', () => {
    const navlinkActions = new NavlinkActions();
    expect(navlinkActions.get('foo-nav')).toBe('navlink:foo-nav');
  });
});
