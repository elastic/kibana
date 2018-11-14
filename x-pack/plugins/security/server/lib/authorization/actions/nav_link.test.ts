/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NavLinkActions } from './nav_link';

describe('#all', () => {
  test(`returns nav_link:*`, () => {
    const navlinkActions = new NavLinkActions();
    expect(navlinkActions.all).toBe('nav_link:*');
  });
});

describe('#get', () => {
  [null, undefined, '', 1, true, {}].forEach((navLinkId: any) => {
    test(`navLinkId of ${JSON.stringify(navLinkId)} throws error`, () => {
      const navlinkActions = new NavLinkActions();
      expect(() => navlinkActions.get(navLinkId)).toThrowErrorMatchingSnapshot();
    });
  });

  test('returns `nav_link:${navLinkId}`', () => {
    const navlinkActions = new NavLinkActions();
    expect(navlinkActions.get('foo-nav')).toBe('nav_link:foo-nav');
  });
});
