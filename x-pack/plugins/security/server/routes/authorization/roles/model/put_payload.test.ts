/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getPutPayloadSchema } from './put_payload';

const basePrivilegeNamesMap = {
  global: ['all', 'read'],
  space: ['all', 'read'],
};

describe('Put payload schema', () => {
  test('only allows features that match the pattern', () => {
    expect(() =>
      getPutPayloadSchema(() => basePrivilegeNamesMap).validate({
        kibana: [{ feature: { '!foo': ['foo'] } }],
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[kibana.0.feature.key(\\"!foo\\")]: only a-z, A-Z, 0-9, '_', and '-' are allowed"`
    );
  });

  test('only allows feature privileges that match the pattern', () => {
    expect(() =>
      getPutPayloadSchema(() => basePrivilegeNamesMap).validate({
        kibana: [{ feature: { foo: ['!foo'] } }],
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[kibana.0.feature.foo]: only a-z, A-Z, 0-9, '_', and '-' are allowed"`
    );
  });

  test('requires either base or feature', () => {
    for (const kibanaPrivilege of [
      {},
      { base: [] },
      { feature: {} },
      { feature: { foo: [], bar: [] } },
      { base: [], feature: {} },
      { base: [], feature: { foo: [], bar: [] } },
    ]) {
      expect(() =>
        getPutPayloadSchema(() => basePrivilegeNamesMap).validate({
          kibana: [kibanaPrivilege],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[kibana.0]: either [base] or [feature] is expected, but none of them specified"`
      );
    }
  });

  test(`doesn't allow both base and feature in the same entry`, () => {
    expect(() =>
      getPutPayloadSchema(() => basePrivilegeNamesMap).validate({
        kibana: [{ base: ['all'], feature: { foo: ['foo'] } }],
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"[kibana.0]: definition of [feature] isn't allowed when non-empty [base] is defined."`
    );
  });

  describe('global', () => {
    test(`only allows known Kibana global base privileges`, () => {
      expect(() =>
        getPutPayloadSchema(() => basePrivilegeNamesMap).validate({
          kibana: [{ base: ['foo'], spaces: ['*'] }],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[kibana.0.base.0]: unknown global privilege \\"foo\\", must be one of [all,read]"`
      );
    });

    test(`doesn't allow Kibana reserved privileges`, () => {
      expect(() =>
        getPutPayloadSchema(() => basePrivilegeNamesMap).validate({
          kibana: [{ _reserved: ['customApplication1'], spaces: ['*'] }],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[kibana.0._reserved]: definition for this key is missing"`
      );
    });

    test(`only allows one global entry`, () => {
      expect(() =>
        getPutPayloadSchema(() => basePrivilegeNamesMap).validate({
          kibana: [
            { feature: { foo: ['foo-privilege-1'] }, spaces: ['*'] },
            { feature: { bar: ['bar-privilege-1'] }, spaces: ['*'] },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[kibana]: more than one privilege is applied to the following spaces: [*]"`
      );
    });
  });

  describe('space', () => {
    test(`doesn't allow * in a space ID`, () => {
      expect(() =>
        getPutPayloadSchema(() => basePrivilegeNamesMap).validate({
          kibana: [{ spaces: ['foo-*'] }],
        })
      ).toThrowErrorMatchingInlineSnapshot(`
"[kibana.0.spaces]: types that failed validation:
- [kibana.0.spaces.0.0]: expected value to equal [*] but got [foo-*]
- [kibana.0.spaces.1.0]: must be lower case, a-z, 0-9, '_', and '-' are allowed"
`);
    });

    test(`can't assign space and global in same entry`, () => {
      expect(() =>
        getPutPayloadSchema(() => basePrivilegeNamesMap).validate({
          kibana: [{ spaces: ['*', 'foo-space'] }],
        })
      ).toThrowErrorMatchingInlineSnapshot(`
"[kibana.0.spaces]: types that failed validation:
- [kibana.0.spaces.0.1]: expected value to equal [*] but got [foo-space]
- [kibana.0.spaces.1.0]: must be lower case, a-z, 0-9, '_', and '-' are allowed"
`);
    });

    test(`only allows known Kibana space base privileges`, () => {
      expect(() =>
        getPutPayloadSchema(() => basePrivilegeNamesMap).validate({
          kibana: [{ base: ['foo'], spaces: ['foo-space'] }],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[kibana.0.base.0]: unknown space privilege \\"foo\\", must be one of [all,read]"`
      );
    });

    test(`only allows space to be in one entry`, () => {
      expect(() =>
        getPutPayloadSchema(() => basePrivilegeNamesMap).validate({
          kibana: [
            { feature: { foo: ['foo-privilege-1'] }, spaces: ['marketing'] },
            { feature: { bar: ['bar-privilege-1'] }, spaces: ['sales', 'marketing'] },
          ],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[kibana]: more than one privilege is applied to the following spaces: [marketing]"`
      );
    });

    test(`doesn't allow Kibana reserved privileges`, () => {
      expect(() =>
        getPutPayloadSchema(() => basePrivilegeNamesMap).validate({
          kibana: [{ _reserved: ['customApplication1'], spaces: ['marketing'] }],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[kibana.0._reserved]: definition for this key is missing"`
      );
    });
  });

  test('allows empty role', () => {
    expect(getPutPayloadSchema(() => basePrivilegeNamesMap).validate({})).toMatchInlineSnapshot(`
      Object {
        "elasticsearch": Object {},
      }
    `);
  });

  test('if spaces is not specified, defaults to global', () => {
    expect(
      getPutPayloadSchema(() => basePrivilegeNamesMap).validate({
        kibana: [{ base: ['all'] }],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "elasticsearch": Object {},
        "kibana": Array [
          Object {
            "base": Array [
              "all",
            ],
            "spaces": Array [
              "*",
            ],
          },
        ],
      }
    `);
  });

  test('allows base with empty array and feature in the same entry', () => {
    expect(
      getPutPayloadSchema(() => basePrivilegeNamesMap).validate({
        kibana: [{ base: [], feature: { foo: ['foo'] } }],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "elasticsearch": Object {},
        "kibana": Array [
          Object {
            "base": Array [],
            "feature": Object {
              "foo": Array [
                "foo",
              ],
            },
            "spaces": Array [
              "*",
            ],
          },
        ],
      }
    `);
  });

  test('allows base and feature with empty object in the same entry', () => {
    expect(
      getPutPayloadSchema(() => basePrivilegeNamesMap).validate({
        kibana: [{ base: ['all'], feature: {} }],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "elasticsearch": Object {},
        "kibana": Array [
          Object {
            "base": Array [
              "all",
            ],
            "feature": Object {},
            "spaces": Array [
              "*",
            ],
          },
        ],
      }
    `);
  });

  test('allows full set of fields', () => {
    expect(
      getPutPayloadSchema(() => basePrivilegeNamesMap).validate({
        metadata: {
          foo: 'test-metadata',
        },
        elasticsearch: {
          cluster: ['test-cluster-privilege'],
          indices: [
            {
              field_security: {
                grant: ['test-field-security-grant-1', 'test-field-security-grant-2'],
                except: ['test-field-security-except-1', 'test-field-security-except-2'],
              },
              names: ['test-index-name-1', 'test-index-name-2'],
              privileges: ['test-index-privilege-1', 'test-index-privilege-2'],
              query: `{ "match": { "title": "foo" } }`,
            },
          ],
          run_as: ['test-run-as-1', 'test-run-as-2'],
        },
        kibana: [
          {
            base: ['all', 'read'],
            spaces: ['*'],
          },
          {
            base: ['all', 'read'],
            spaces: ['test-space-1', 'test-space-2'],
          },
          {
            feature: {
              foo: ['foo-privilege-1', 'foo-privilege-2'],
            },
            spaces: ['test-space-3'],
          },
        ],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "elasticsearch": Object {
          "cluster": Array [
            "test-cluster-privilege",
          ],
          "indices": Array [
            Object {
              "field_security": Object {
                "except": Array [
                  "test-field-security-except-1",
                  "test-field-security-except-2",
                ],
                "grant": Array [
                  "test-field-security-grant-1",
                  "test-field-security-grant-2",
                ],
              },
              "names": Array [
                "test-index-name-1",
                "test-index-name-2",
              ],
              "privileges": Array [
                "test-index-privilege-1",
                "test-index-privilege-2",
              ],
              "query": "{ \\"match\\": { \\"title\\": \\"foo\\" } }",
            },
          ],
          "run_as": Array [
            "test-run-as-1",
            "test-run-as-2",
          ],
        },
        "kibana": Array [
          Object {
            "base": Array [
              "all",
              "read",
            ],
            "spaces": Array [
              "*",
            ],
          },
          Object {
            "base": Array [
              "all",
              "read",
            ],
            "spaces": Array [
              "test-space-1",
              "test-space-2",
            ],
          },
          Object {
            "feature": Object {
              "foo": Array [
                "foo-privilege-1",
                "foo-privilege-2",
              ],
            },
            "spaces": Array [
              "test-space-3",
            ],
          },
        ],
        "metadata": Object {
          "foo": "test-metadata",
        },
      }
    `);
  });
});
