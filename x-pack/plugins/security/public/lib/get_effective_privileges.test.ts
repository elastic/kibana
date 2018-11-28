/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getEffectivePrivileges } from './get_effective_privileges';

describe('getEffectivePrivileges', () => {
  it('returns an empty array when no privileges are granted', () => {
    const effectivePrivileges = getEffectivePrivileges(
      {
        all: {
          actions: ['ui:*', 'saved_objects:*', 'api:*'],
        },
        read: {
          actions: ['ui:foo/bar', 'api:console_log'],
        },
        all_ui: {
          actions: ['ui:*'],
        },
        some_ui: {
          actions: ['ui:foo/*'],
        },
      },
      []
    );
    expect(effectivePrivileges).toEqual([]);
  });

  it('returns an empty array when no effective privileges are granted from assigned privileges', () => {
    const effectivePrivileges = getEffectivePrivileges(
      {
        all: {
          actions: ['ui:*', 'saved_objects:*', 'api:*'],
        },
        read: {
          actions: ['ui:foo/bar', 'api:console_log'],
        },
        all_ui: {
          actions: ['ui:*'],
        },
        some_ui: {
          actions: ['ui:foo/*'],
        },
      },
      ['read']
    );
    expect(effectivePrivileges).toEqual([]);
  });

  it('does not return privileges that are only partially satisfied', () => {
    const effectivePrivileges = getEffectivePrivileges(
      {
        all_ui: {
          actions: ['ui:*'],
        },
        some_ui: {
          actions: ['ui:foo/*'],
        },
      },
      ['some_ui']
    );
    expect(effectivePrivileges).toEqual([]);
  });

  it('returns privileges that are fully satisfied', () => {
    const effectivePrivileges = getEffectivePrivileges(
      {
        my_privilege: {
          actions: [
            'ui:*',
            'api:foo/bar/baz',
            'saved_object:space/read',
            'navLink:management/spaces',
          ],
        },
        unexpected_effective_1: {
          actions: [
            'ui:some/very/specific/link',
            'api:for/bar/baz',
            'saved_object:space/read',
            'navLink:management/spaces/something',
          ],
        },
        unexpected_effective_2: {
          actions: [
            'ui:*',
            'api:foo/bar/*',
            'saved_object:space/read',
            'navLink:management/spaces',
          ],
        },
        expected_effective_1: {
          actions: [
            'ui:*',
            'api:foo/bar/baz',
            'saved_object:space/read',
            'navLink:management/spaces',
          ],
        },
        expected_effective_2: {
          actions: ['ui:some/very/specific/link'],
        },
        expected_effective_3: {
          actions: ['api:foo/bar/baz', 'saved_object:space/read'],
        },
      },
      ['my_privilege']
    );
    expect(effectivePrivileges).toEqual([
      'expected_effective_1',
      'expected_effective_2',
      'expected_effective_3',
    ]);
  });
});
