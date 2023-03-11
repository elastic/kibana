/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';

import {
  calculatePackagePrivilegesFromCapabilities,
  calculatePackagePrivilegesFromKibanaPrivileges,
} from './authz';
import { ENDPOINT_PRIVILEGES } from './constants';

const SECURITY_SOLUTION_ID = DEFAULT_APP_CATEGORIES.security.id;

function generateActions<T>(privileges: T, overrides: Record<string, boolean> = {}) {
  return Object.keys(privileges).reduce((acc, privilege) => {
    const executePackageAction = overrides[privilege] || false;

    return {
      ...acc,
      [privilege]: {
        executePackageAction,
      },
    };
  }, {});
}

describe('fleet authz', () => {
  describe('calculatePackagePrivilegesFromCapabilities', () => {
    it('calculates privileges correctly', () => {
      const endpointCapabilities = {
        writeEndpointList: true,
        writeTrustedApplications: true,
        writePolicyManagement: false,
        readPolicyManagement: true,
        writeHostIsolationExceptions: true,
        writeHostIsolation: false,
      };
      const expected = {
        endpoint: {
          actions: generateActions(ENDPOINT_PRIVILEGES, endpointCapabilities),
        },
      };
      const actual = calculatePackagePrivilegesFromCapabilities({
        navLinks: {},
        management: {},
        catalogue: {},
        siem: endpointCapabilities,
      });

      expect(actual).toEqual(expected);
    });
  });

  describe('calculatePackagePrivilegesFromKibanaPrivileges', () => {
    it('calculates privileges correctly', () => {
      const endpointPrivileges = [
        { privilege: `${SECURITY_SOLUTION_ID}-writeEndpointList`, authorized: true },
        { privilege: `${SECURITY_SOLUTION_ID}-writeTrustedApplications`, authorized: true },
        { privilege: `${SECURITY_SOLUTION_ID}-writePolicyManagement`, authorized: false },
        { privilege: `${SECURITY_SOLUTION_ID}-readPolicyManagement`, authorized: true },
        { privilege: `${SECURITY_SOLUTION_ID}-writeHostIsolationExceptions`, authorized: true },
        { privilege: `${SECURITY_SOLUTION_ID}-writeHostIsolation`, authorized: false },
        { privilege: `${SECURITY_SOLUTION_ID}-ignoreMe`, authorized: true },
      ];
      const expected = {
        endpoint: {
          actions: generateActions(ENDPOINT_PRIVILEGES, {
            writeEndpointList: true,
            writeTrustedApplications: true,
            writePolicyManagement: false,
            readPolicyManagement: true,
            writeHostIsolationExceptions: true,
            writeHostIsolation: false,
          }),
        },
      };
      const actual = calculatePackagePrivilegesFromKibanaPrivileges(endpointPrivileges);
      expect(actual).toEqual(expected);
    });
  });
});
