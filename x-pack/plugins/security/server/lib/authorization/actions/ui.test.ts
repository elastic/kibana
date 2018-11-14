/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UiActions } from './ui';

describe('#all', () => {
  test('returns ui:*', () => {
    const uiActions = new UiActions();
    expect(uiActions.all).toBe('ui:*');
  });
});

describe('#allNavlinks', () => {
  test('returns ui:navLinks/*', () => {
    const uiActions = new UiActions();
    expect(uiActions.all).toBe('ui:navLinks/*');
  });
});

describe('#get', () => {
  [null, undefined, '', 1, true, {}].forEach((featureId: any) => {
    test(`featureId of ${JSON.stringify(featureId)} throws error`, () => {
      const uiActions = new UiActions();
      expect(() => uiActions.get(featureId, 'foo-capability')).toThrowErrorMatchingSnapshot();
    });
  });

  [null, undefined, '', 1, true, {}].forEach((uiCapability: any) => {
    test(`uiCapability of ${JSON.stringify(uiCapability)} throws error`, () => {
      const uiActions = new UiActions();
      expect(() => uiActions.get('foo', uiCapability)).toThrowErrorMatchingSnapshot();
    });
  });

  test('returns `ui:${featureId}/${uiCapaility}`', () => {
    const uiActions = new UiActions();
    expect(uiActions.get('foo', 'foo-capability')).toBe('ui:foo/foo-capability');
  });
});
