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

    test('siem privileges === ["all"]', () => {
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

    test('siem privileges === ["read"]', () => {
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
    test('should be empty if siem privileges is an empty array', () => {
      expect(updateSecuritySolutionPrivileges([])).toMatchInlineSnapshot(`Object {}`);
    });

    test('siem privileges === ["minimal_all"]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_all'])).toMatchInlineSnapshot(`
        Object {
          "siem": Array [
            "all",
          ],
        }
      `);
    });

    test('siem privileges === ["minimal_all", "cases_read"]', () => {
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

    test('siem privileges === ["minimal_all", "cases_all"]', () => {
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

    test('siem privileges === ["minimal_read"]', () => {
      expect(updateSecuritySolutionPrivileges(['minimal_read'])).toMatchInlineSnapshot(`
        Object {
          "siem": Array [
            "read",
          ],
        }
      `);
    });

    test('siem privileges === ["minimal_read", "cases_read"]', () => {
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

    test('siem privileges === ["minimal_read", "cases_all"]', () => {
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
  });
});
