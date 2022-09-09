/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Capabilities } from '@kbn/core-capabilities-common';

import {
  calculatePackagePrivilegesFromCapabilities,
  calculatePackagePrivilegesFromKibanaPrivileges,
} from './authz';
import { ENDPOINT_PRIVILEGES, SECURITY_SOLUTION_ID } from './constants';

function generateActions(privileges: string[] = [], overrides: Record<string, boolean> = {}) {
  return privileges.reduce((acc, privilege) => {
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
      const endpointCapablities = {
        writeEndpointList: true,
        writeTrustedApplications: true,
        writePolicyManagement: false,
        readPolicyManagement: true,
        writeHostIsolationExceptions: true,
        writeHostIsolation: false,
      };
      const expected = {
        endpoint: {
          actions: generateActions(ENDPOINT_PRIVILEGES, endpointCapablities),
        },
      };
      const actual = calculatePackagePrivilegesFromCapabilities({
        siem: endpointCapablities,
      } as unknown as Capabilities);

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
