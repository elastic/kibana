/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateEndpointAuthz, getEndpointAuthzInitialState } from './authz';
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
  });

  describe('getEndpointAuthzInitialState()', () => {
    it('returns expected initial state', () => {
      expect(getEndpointAuthzInitialState()).toEqual({
        canAccessFleet: false,
        canAccessEndpointManagement: false,
        canIsolateHost: false,
        canUnIsolateHost: true,
        canCreateArtifactsByPolicy: false,
        canKillProcess: false,
        canSuspendProcess: false,
        canGetRunningProcesses: false,
        canAccessResponseConsole: false,
        canAccessResponseActionsHistory: false,
      });
    });
  });
});
