/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  calculateEndpointAuthz,
  calculatePermissionsFromCapabilities,
  calculatePermissionsFromPrivileges,
  defaultEndpointPermissions,
  getEndpointAuthzInitialState,
} from './authz';
import type { FleetAuthz } from '@kbn/fleet-plugin/common';
import { createFleetAuthzMock } from '@kbn/fleet-plugin/common';
import { createLicenseServiceMock } from '../../../license/mocks';
import type { EndpointAuthzKeyList } from '../../types/authz';

describe('Endpoint Authz service', () => {
  let licenseService: ReturnType<typeof createLicenseServiceMock>;
  let fleetAuthz: FleetAuthz;
  let userRoles: string[];

  beforeEach(() => {
    licenseService = createLicenseServiceMock();
    fleetAuthz = createFleetAuthzMock();
    userRoles = ['superuser'];
  });

  describe('calculateEndpointAuthz()', () => {
    describe('and `fleet.all` access is true', () => {
      it.each<EndpointAuthzKeyList>([
        ['canAccessFleet'],
        ['canAccessEndpointManagement'],
        ['canIsolateHost'],
        ['canUnIsolateHost'],
        ['canKillProcess'],
        ['canSuspendProcess'],
        ['canGetRunningProcesses'],
      ])('should set `%s` to `true`', (authProperty) => {
        expect(calculateEndpointAuthz(licenseService, fleetAuthz, userRoles)[authProperty]).toBe(
          true
        );
      });

      it('should set `canIsolateHost` to false if not proper license', () => {
        licenseService.isPlatinumPlus.mockReturnValue(false);

        expect(calculateEndpointAuthz(licenseService, fleetAuthz, userRoles).canIsolateHost).toBe(
          false
        );
      });

      it('should set `canKillProcess` to false if not proper license', () => {
        licenseService.isEnterprise.mockReturnValue(false);

        expect(calculateEndpointAuthz(licenseService, fleetAuthz, userRoles).canKillProcess).toBe(
          false
        );
      });

      it('should set `canSuspendProcess` to false if not proper license', () => {
        licenseService.isEnterprise.mockReturnValue(false);

        expect(
          calculateEndpointAuthz(licenseService, fleetAuthz, userRoles).canSuspendProcess
        ).toBe(false);
      });

      it('should set `canGetRunningProcesses` to false if not proper license', () => {
        licenseService.isEnterprise.mockReturnValue(false);

        expect(
          calculateEndpointAuthz(licenseService, fleetAuthz, userRoles).canGetRunningProcesses
        ).toBe(false);
      });

      it('should set `canUnIsolateHost` to true even if not proper license', () => {
        licenseService.isPlatinumPlus.mockReturnValue(false);

        expect(calculateEndpointAuthz(licenseService, fleetAuthz, userRoles).canUnIsolateHost).toBe(
          true
        );
      });
    });

    describe('and `fleet.all` access is false', () => {
      beforeEach(() => {
        fleetAuthz.fleet.all = false;
        userRoles = [];
      });

      it.each<EndpointAuthzKeyList>([
        ['canAccessFleet'],
        ['canAccessEndpointManagement'],
        ['canIsolateHost'],
        ['canUnIsolateHost'],
        ['canKillProcess'],
        ['canSuspendProcess'],
        ['canGetRunningProcesses'],
      ])('should set `%s` to `false`', (authProperty) => {
        expect(calculateEndpointAuthz(licenseService, fleetAuthz, userRoles)[authProperty]).toBe(
          false
        );
      });

      it('should set `canUnIsolateHost` to false when policy is also not platinum', () => {
        licenseService.isPlatinumPlus.mockReturnValue(false);

        expect(calculateEndpointAuthz(licenseService, fleetAuthz, userRoles).canUnIsolateHost).toBe(
          false
        );
      });
    });

    describe('and endpoint rbac is enabled', () => {
      it.each<[EndpointAuthzKeyList[number], string]>([
        ['canWriteEndpointList', 'writeEndpointList'],
        ['canReadEndpointList', 'readEndpointList'],
        ['canWritePolicyManagement', 'writePolicyManagement'],
        ['canReadPolicyManagement', 'readPolicyManagement'],
        ['canWriteActionsLogManagement', 'writeActionsLogManagement'],
        ['canReadActionsLogManagement', 'readActionsLogManagement'],
        ['canIsolateHost', 'writeHostIsolation'],
        ['canUnIsolateHost', 'writeHostIsolation'],
        ['canKillProcess', 'writeProcessOperations'],
        ['canSuspendProcess', 'writeProcessOperations'],
        ['canGetRunningProcesses', 'writeProcessOperations'],
        ['canWriteFileOperations', 'writeFileOperations'],
        ['canWriteTrustedApplications', 'writeTrustedApplications'],
        ['canReadTrustedApplications', 'readTrustedApplications'],
        ['canWriteHostIsolationExceptions', 'writeHostIsolationExceptions'],
        ['canReadHostIsolationExceptions', 'readHostIsolationExceptions'],
        ['canWriteBlocklist', 'writeBlocklist'],
        ['canReadBlocklist', 'readBlocklist'],
        ['canWriteEventFilters', 'writeEventFilters'],
        ['canReadEventFilters', 'readEventFilters'],
      ])('%s should be true if `packagePrivilege.%s` is `true`', (auth) => {
        const authz = calculateEndpointAuthz(licenseService, fleetAuthz, userRoles, true);
        expect(authz[auth]).toBe(true);
      });

      it.each<[EndpointAuthzKeyList[number], string[]]>([
        ['canWriteEndpointList', ['writeEndpointList']],
        ['canReadEndpointList', ['writeEndpointList', 'readEndpointList']],
        ['canWritePolicyManagement', ['writePolicyManagement']],
        ['canReadPolicyManagement', ['writePolicyManagement', 'readPolicyManagement']],
        ['canWriteActionsLogManagement', ['writeActionsLogManagement']],
        ['canReadActionsLogManagement', ['writeActionsLogManagement', 'readActionsLogManagement']],
        ['canIsolateHost', ['writeHostIsolation']],
        ['canUnIsolateHost', ['writeHostIsolation']],
        ['canKillProcess', ['writeProcessOperations']],
        ['canSuspendProcess', ['writeProcessOperations']],
        ['canGetRunningProcesses', ['writeProcessOperations']],
        ['canWriteFileOperations', ['writeFileOperations']],
        ['canWriteTrustedApplications', ['writeTrustedApplications']],
        ['canReadTrustedApplications', ['writeTrustedApplications', 'readTrustedApplications']],
        ['canWriteHostIsolationExceptions', ['writeHostIsolationExceptions']],
        [
          'canReadHostIsolationExceptions',
          ['writeHostIsolationExceptions', 'readHostIsolationExceptions'],
        ],
        ['canWriteBlocklist', ['writeBlocklist']],
        ['canReadBlocklist', ['writeBlocklist', 'readBlocklist']],
        ['canWriteEventFilters', ['writeEventFilters']],
        ['canReadEventFilters', ['writeEventFilters', 'readEventFilters']],
      ])('%s should be false if `packagePrivilege.%s` is `false`', (auth, privileges) => {
        // read permission checks for write || read so we need to set both to false
        privileges.forEach((privilege) => {
          fleetAuthz.packagePrivileges!.endpoint.actions[privilege].executePackageAction = false;
        });
        const authz = calculateEndpointAuthz(licenseService, fleetAuthz, userRoles, true);
        expect(authz[auth]).toBe(false);
      });
    });

    it('correctly handles permissions', () => {
      const authz = calculateEndpointAuthz(licenseService, fleetAuthz, userRoles, true, {
        canWriteSecuritySolution: false,
        canReadSecuritySolution: true,
      });
      expect(authz.canWriteSecuritySolution).toBe(false);
      expect(authz.canReadSecuritySolution).toBe(true);
    });
  });

  describe('defaultEndpointPermissions', () => {
    it('returns expected permissions', () => {
      expect(defaultEndpointPermissions()).toEqual({
        canWriteSecuritySolution: false,
        canReadSecuritySolution: false,
      });
    });
  });

  describe('getEndpointAuthzInitialState()', () => {
    it('returns expected initial state', () => {
      expect(getEndpointAuthzInitialState()).toEqual({
        canWriteSecuritySolution: false,
        canReadSecuritySolution: false,
        canAccessFleet: false,
        canAccessEndpointManagement: false,
        canCreateArtifactsByPolicy: false,
        canWriteEndpointList: false,
        canReadEndpointList: false,
        canWritePolicyManagement: false,
        canReadPolicyManagement: false,
        canWriteActionsLogManagement: false,
        canReadActionsLogManagement: false,
        canIsolateHost: false,
        canUnIsolateHost: true,
        canKillProcess: false,
        canSuspendProcess: false,
        canGetRunningProcesses: false,
        canAccessResponseConsole: false,
        canWriteFileOperations: false,
        canWriteTrustedApplications: false,
        canReadTrustedApplications: false,
        canWriteHostIsolationExceptions: false,
        canReadHostIsolationExceptions: false,
        canWriteBlocklist: false,
        canReadBlocklist: false,
        canWriteEventFilters: false,
        canReadEventFilters: false,
      });
    });
  });

  describe('calculatePermissionsFromPrivileges', () => {
    it('returns default permissions if no privileges', () => {
      const permissions = calculatePermissionsFromPrivileges(undefined);
      expect(permissions).toEqual(defaultEndpointPermissions());
    });

    it('returns expected permissions from privileges', () => {
      const privileges = [
        { privilege: 'ui:8.6.0:siem/crud', authorized: false },
        { privilege: 'ui:8.6.0:siem/show', authorized: true },
        { privilege: 'ui:8.6.0:siem/foobar', authorized: true },
      ];
      const permissions = calculatePermissionsFromPrivileges(privileges);
      expect(permissions).toEqual({
        canWriteSecuritySolution: false,
        canReadSecuritySolution: true,
      });
    });
  });

  describe('calculatePermissionsFromCapabilities', () => {
    it('returns default permissions if no capabilities', () => {
      const permissions = calculatePermissionsFromCapabilities(undefined);
      expect(permissions).toEqual(defaultEndpointPermissions());
    });

    it('returns expected permissions from capabilities', () => {
      const capabilities = {
        navLinks: {},
        management: {},
        catalogue: {},
        siem: {
          crud: false,
          show: true,
          foobar: true,
        },
      };
      const permissions = calculatePermissionsFromCapabilities(capabilities);
      expect(permissions).toEqual({
        canWriteSecuritySolution: false,
        canReadSecuritySolution: true,
      });
    });
  });
});
