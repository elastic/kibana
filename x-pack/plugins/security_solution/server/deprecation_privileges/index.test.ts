/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateSecuritySolutionPrivileges } from '.';

describe('deprecations', () => {
  describe('create cases privileges from siem privileges without cases sub-feature', () => {
    test('should be empty if siem privileges is an empty array', () => {
      expect(updateSecuritySolutionPrivileges([])).toMatchInlineSnapshot(`Object {}`);
    });

    test('creates cases privilege ["all"] when siem privilege is ["all"]', () => {
      expect(updateSecuritySolutionPrivileges(['all'])).toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "all",
          ],
        }
      `);
    });

    test('creates cases privilege ["all"] when siem privilege is ["all", "read"]', () => {
      expect(updateSecuritySolutionPrivileges(['all', 'read'])).toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "all",
          ],
        }
      `);
    });

    test('creates cases privilege ["all"] when siem privilege is ["read", "all"]', () => {
      expect(updateSecuritySolutionPrivileges(['read', 'all'])).toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "all",
          ],
        }
      `);
    });

    test('creates cases privilege ["read"] when siem privilege is ["read"]', () => {
      expect(updateSecuritySolutionPrivileges(['read'])).toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "read",
          ],
          "siem": Array [
            "read",
          ],
        }
      `);
    });
  });

  describe('create cases privileges from siem privileges with cases sub-feature', () => {
    test('No cases privilege when siem privilege is ["minimal_all"]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_all'])).toMatchInlineSnapshot(`
        Object {
          "siem": Array [
            "all",
          ],
        }
      `);
    });

    test('No cases privilege when siem privilege is ["minimal_read"]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_read'])).toMatchInlineSnapshot(`
        Object {
          "siem": Array [
            "read",
          ],
        }
      `);
    });

    test('No cases privilege when siem privilege is ["minimal_read", "minimal_all"]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_read', 'minimal_all']))
        .toMatchInlineSnapshot(`
        Object {
          "siem": Array [
            "all",
          ],
        }
      `);
    });

    test('creates cases privilege ["all"] when siem privilege is ["minimal_all", "all"]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_all', 'all'])).toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "all",
          ],
        }
      `);
    });

    test('creates cases privilege ["all"] when siem privilege is ["all", "minimal_read"]', () => {
      expect(updateSecuritySolutionPrivileges(['all', 'minimal_read'])).toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "read",
          ],
        }
      `);
    });

    test('creates cases privilege ["all"] when siem privilege is ["minimal_all", "cases_all"]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_all', 'cases_all'])).toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "all",
          ],
        }
      `);
    });

    test('creates cases privilege ["all"] when siem privilege is [minimal_all, cases_read, cases_all]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_all', 'cases_read', 'cases_all']))
        .toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "all",
          ],
        }
      `);
    });

    test('creates cases privilege ["all"] when siem privilege is [minimal_all, cases_all, cases_read]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_all', 'cases_all', 'cases_read']))
        .toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "all",
          ],
        }
      `);
    });

    test('creates cases privilege ["all"] when siem privilege is ["all", "cases_read"]', () => {
      expect(updateSecuritySolutionPrivileges(['all', 'cases_read'])).toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "all",
          ],
        }
      `);
    });

    test('creates cases privilege ["read"] when siem privilege is ["minimal_all", "read"]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_all', 'read'])).toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "read",
          ],
          "siem": Array [
            "all",
          ],
        }
      `);
    });

    test('creates cases privilege ["read"] when siem privilege is ["read", "minimal_read"]', () => {
      expect(updateSecuritySolutionPrivileges(['read', 'minimal_read'])).toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "read",
          ],
          "siem": Array [
            "read",
          ],
        }
      `);
    });

    test('creates cases privilege ["read"] when siem privilege is ["minimal_all", "cases_read"]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_all', 'cases_read']))
        .toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "read",
          ],
          "siem": Array [
            "all",
          ],
        }
      `);
    });

    test('creates cases privilege ["read"] when siem privilege is ["minimal_all", "read", "cases_read"]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_all', 'read', 'cases_read']))
        .toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "read",
          ],
          "siem": Array [
            "all",
          ],
        }
      `);
    });

    test('creates cases privilege ["read"] when siem privilege is ["minimal_read", "cases_read"]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_read', 'cases_read']))
        .toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "read",
          ],
          "siem": Array [
            "read",
          ],
        }
      `);
    });

    test('creates cases privilege ["all"] when siem privilege is ["minimal_read", "cases_all"]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_read', 'cases_all']))
        .toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "read",
          ],
        }
      `);
    });

    test('creates cases privilege ["all"] when siem privilege is [minimal_read, cases_read, cases_all]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_read', 'cases_read', 'cases_all']))
        .toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "read",
          ],
        }
      `);
    });

    test('creates cases privilege ["all"] when siem privilege is [minimal_read, cases_all, cases_read]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_read', 'cases_all', 'cases_read']))
        .toMatchInlineSnapshot(`
        Object {
          "securitySolutionCases": Array [
            "all",
          ],
          "siem": Array [
            "read",
          ],
        }
      `);
    });
  });
});
