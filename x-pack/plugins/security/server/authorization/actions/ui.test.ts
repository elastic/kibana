/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UIActions } from './ui';

const version = '1.0.0-zeta1';

describe('#get', () => {
  [null, undefined, '', 1, true, {}].forEach((featureId: any) => {
    test(`featureId of ${JSON.stringify(featureId)} throws error`, () => {
      const uiActions = new UIActions(version);
      expect(() => uiActions.get(featureId, 'foo-capability')).toThrowErrorMatchingSnapshot();
    });
  });

  [null, undefined, '', 1, true, '!'].forEach((uiCapability: any) => {
    test(`uiCapability of ${JSON.stringify(uiCapability)} throws error`, () => {
      const uiActions = new UIActions(version);
      expect(() => uiActions.get('foo', uiCapability)).toThrowErrorMatchingSnapshot();
    });
  });

  test('returns `ui:${version}:${featureId}/${uiCapaility}`', () => {
    const uiActions = new UIActions(version);
    expect(uiActions.get('foo', 'foo-capability')).toBe('ui:1.0.0-zeta1:foo/foo-capability');
  });

  test('returns `ui:${version}:${featureId}/${uiCapabilityPart}/${uiCapabilitySubPart}', () => {
    const uiActions = new UIActions(version);
    expect(uiActions.get('foo', 'fooCapability', 'subFoo')).toBe(
      'ui:1.0.0-zeta1:foo/fooCapability/subFoo'
    );
  });
});
