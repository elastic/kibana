/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';
import {
  ManagementApp,
  ManagementSetup,
  DefinedSections,
} from '../../../../../src/plugins/management/public';
import { createManagementSectionMock } from '../../../../../src/plugins/management/public/mocks';
import { SecurityLicenseFeatures } from '../../common/licensing/license_features';
import { ManagementService } from './management_service';
import { usersManagementApp } from './users';

import { coreMock } from '../../../../../src/core/public/mocks';
import { licenseMock } from '../../common/licensing/index.mock';
import { securityMock } from '../mocks';
import { rolesManagementApp } from './roles';
import { apiKeysManagementApp } from './api_keys';
import { roleMappingsManagementApp } from './role_mappings';

const mockSection = createManagementSectionMock();

describe('ManagementService', () => {
  describe('setup()', () => {
    it('properly registers security section and its applications', () => {
      const { fatalErrors, getStartServices } = coreMock.createSetup();
      const { authc } = securityMock.createSetup();
      const license = licenseMock.create();

      const managementSetup: ManagementSetup = {
        sections: {
          register: jest.fn(() => mockSection),
          section: {
            security: mockSection,
          } as DefinedSections,
        },
      };

      const service = new ManagementService();
      service.setup({
        getStartServices: getStartServices as any,
        license,
        fatalErrors,
        authc,
        management: managementSetup,
      });

      expect(mockSection.registerApp).toHaveBeenCalledTimes(4);
      expect(mockSection.registerApp).toHaveBeenCalledWith({
        id: 'users',
        mount: expect.any(Function),
        order: 10,
        title: 'Users',
      });
      expect(mockSection.registerApp).toHaveBeenCalledWith({
        id: 'roles',
        mount: expect.any(Function),
        order: 20,
        title: 'Roles',
      });
      expect(mockSection.registerApp).toHaveBeenCalledWith({
        id: 'api_keys',
        mount: expect.any(Function),
        order: 30,
        title: 'API Keys',
      });
      expect(mockSection.registerApp).toHaveBeenCalledWith({
        id: 'role_mappings',
        mount: expect.any(Function),
        order: 40,
        title: 'Role Mappings',
      });
    });
  });

  describe('start()', () => {
    function startService(initialFeatures: Partial<SecurityLicenseFeatures>) {
      const { fatalErrors, getStartServices } = coreMock.createSetup();

      const licenseSubject = new BehaviorSubject<SecurityLicenseFeatures>(
        (initialFeatures as unknown) as SecurityLicenseFeatures
      );
      const license = licenseMock.create();
      license.features$ = licenseSubject;

      const service = new ManagementService();

      const managementSetup: ManagementSetup = {
        sections: {
          register: jest.fn(() => mockSection),
          section: {
            security: mockSection,
          } as DefinedSections,
        },
      };

      service.setup({
        getStartServices: getStartServices as any,
        license,
        fatalErrors,
        authc: securityMock.createSetup().authc,
        management: managementSetup,
      });

      const getMockedApp = () => {
        // All apps are enabled by default.
        let enabled = true;
        return ({
          get enabled() {
            return enabled;
          },
          enable: jest.fn().mockImplementation(() => {
            enabled = true;
          }),
          disable: jest.fn().mockImplementation(() => {
            enabled = false;
          }),
        } as unknown) as jest.Mocked<ManagementApp>;
      };
      mockSection.getApp = jest.fn().mockImplementation((id) => mockApps.get(id));
      const mockApps = new Map<string, jest.Mocked<ManagementApp>>([
        [usersManagementApp.id, getMockedApp()],
        [rolesManagementApp.id, getMockedApp()],
        [apiKeysManagementApp.id, getMockedApp()],
        [roleMappingsManagementApp.id, getMockedApp()],
      ] as Array<[string, jest.Mocked<ManagementApp>]>);

      service.start();

      return {
        mockApps,
        updateFeatures(features: Partial<SecurityLicenseFeatures>) {
          licenseSubject.next((features as unknown) as SecurityLicenseFeatures);
        },
      };
    }

    it('does not do anything if `showLinks` is `true` at `start`', () => {
      const { mockApps } = startService({ showLinks: true, showRoleMappingsManagement: true });
      for (const [, mockApp] of mockApps) {
        expect(mockApp.enable).not.toHaveBeenCalled();
        expect(mockApp.disable).not.toHaveBeenCalled();
        expect(mockApp.enabled).toBe(true);
      }
    });

    it('disables all apps if `showLinks` is `false` at `start`', () => {
      const { mockApps } = startService({ showLinks: false, showRoleMappingsManagement: true });
      for (const [, mockApp] of mockApps) {
        expect(mockApp.enabled).toBe(false);
      }
    });

    it('disables only Role Mappings app if `showLinks` is `true`, but `showRoleMappingsManagement` is `false` at `start`', () => {
      const { mockApps } = startService({ showLinks: true, showRoleMappingsManagement: false });
      for (const [appId, mockApp] of mockApps) {
        expect(mockApp.enabled).toBe(appId !== roleMappingsManagementApp.id);
      }
    });

    it('apps are disabled if `showLinks` changes after `start`', () => {
      const { mockApps, updateFeatures } = startService({
        showLinks: true,
        showRoleMappingsManagement: true,
      });
      for (const [, mockApp] of mockApps) {
        expect(mockApp.enabled).toBe(true);
      }

      updateFeatures({ showLinks: false, showRoleMappingsManagement: false });

      for (const [, mockApp] of mockApps) {
        expect(mockApp.enabled).toBe(false);
      }
    });

    it('role mappings app is disabled if `showRoleMappingsManagement` changes after `start`', () => {
      const { mockApps, updateFeatures } = startService({
        showLinks: true,
        showRoleMappingsManagement: true,
      });
      for (const [, mockApp] of mockApps) {
        expect(mockApp.enabled).toBe(true);
      }

      updateFeatures({ showLinks: true, showRoleMappingsManagement: false });

      for (const [appId, mockApp] of mockApps) {
        expect(mockApp.enabled).toBe(appId !== roleMappingsManagementApp.id);
      }
    });

    it('apps are re-enabled if `showLinks` eventually transitions to `true` after `start`', () => {
      const { mockApps, updateFeatures } = startService({
        showLinks: true,
        showRoleMappingsManagement: true,
      });
      for (const [, mockApp] of mockApps) {
        expect(mockApp.enabled).toBe(true);
      }

      updateFeatures({ showLinks: false, showRoleMappingsManagement: false });

      for (const [, mockApp] of mockApps) {
        expect(mockApp.enabled).toBe(false);
      }

      updateFeatures({ showLinks: true, showRoleMappingsManagement: true });

      for (const [, mockApp] of mockApps) {
        expect(mockApp.enabled).toBe(true);
      }
    });
  });
});
