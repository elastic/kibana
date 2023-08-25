/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';

import { coreMock } from '@kbn/core/public/mocks';
import type {
  DefinedSections,
  ManagementApp,
  ManagementSetup,
} from '@kbn/management-plugin/public';
import { createManagementSectionMock } from '@kbn/management-plugin/public/mocks';

import { apiKeysManagementApp } from './api_keys';
import type { ManagementAppConfigType } from './management_service';
import { ManagementService } from './management_service';
import { roleMappingsManagementApp } from './role_mappings';
import { rolesManagementApp } from './roles';
import { usersManagementApp } from './users';
import { licenseMock } from '../../common/licensing/index.mock';
import type { SecurityLicenseFeatures } from '../../common/licensing/license_features';
import { securityMock } from '../mocks';

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
        locator: {} as any,
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
        title: 'API keys',
      });
      expect(mockSection.registerApp).toHaveBeenCalledWith({
        id: 'role_mappings',
        mount: expect.any(Function),
        order: 40,
        title: 'Role Mappings',
      });
    });

    it('Users, Roles, and Role Mappings are not registered when their UI config settings are set to false', () => {
      const mockSectionWithConfig = createManagementSectionMock();
      const { fatalErrors, getStartServices } = coreMock.createSetup();
      const { authc } = securityMock.createSetup();
      const license = licenseMock.create();

      const managementSetup: ManagementSetup = {
        sections: {
          register: jest.fn(() => mockSectionWithConfig),
          section: {
            security: mockSectionWithConfig,
          } as DefinedSections,
        },
        locator: {} as any,
      };

      const uiConfig: ManagementAppConfigType = {
        userManagementEnabled: false,
        roleManagementEnabled: false,
        roleMappingManagementEnabled: false,
      };

      const service = new ManagementService();
      service.setup({
        getStartServices: getStartServices as any,
        license,
        fatalErrors,
        authc,
        management: managementSetup,
        uiConfig,
      });

      // Only API Keys app should be registered
      expect(mockSectionWithConfig.registerApp).toHaveBeenCalledTimes(1);
      expect(mockSectionWithConfig.registerApp).not.toHaveBeenCalledWith({
        id: 'users',
        mount: expect.any(Function),
        order: 10,
        title: 'Users',
      });
      expect(mockSectionWithConfig.registerApp).not.toHaveBeenCalledWith({
        id: 'roles',
        mount: expect.any(Function),
        order: 20,
        title: 'Roles',
      });
      expect(mockSectionWithConfig.registerApp).toHaveBeenCalledWith({
        id: 'api_keys',
        mount: expect.any(Function),
        order: 30,
        title: 'API keys',
      });
      expect(mockSectionWithConfig.registerApp).not.toHaveBeenCalledWith({
        id: 'role_mappings',
        mount: expect.any(Function),
        order: 40,
        title: 'Role Mappings',
      });
    });
  });

  describe('start()', () => {
    function startService(
      initialFeatures: Partial<SecurityLicenseFeatures>,
      canManageSecurity: boolean = true
    ) {
      const { fatalErrors, getStartServices } = coreMock.createSetup();

      const licenseSubject = new BehaviorSubject<SecurityLicenseFeatures>(
        initialFeatures as unknown as SecurityLicenseFeatures
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
        locator: {} as any,
      };

      const uiConfig: ManagementAppConfigType = {
        userManagementEnabled: true,
        roleManagementEnabled: true,
        roleMappingManagementEnabled: true,
      };

      service.setup({
        getStartServices: getStartServices as any,
        license,
        fatalErrors,
        authc: securityMock.createSetup().authc,
        management: managementSetup,
        uiConfig,
      });

      const getMockedApp = (id: string) => {
        // All apps are enabled by default.
        let enabled = true;
        return {
          id,
          get enabled() {
            return enabled;
          },
          enable: jest.fn().mockImplementation(() => {
            enabled = true;
          }),
          disable: jest.fn().mockImplementation(() => {
            enabled = false;
          }),
        } as unknown as jest.Mocked<ManagementApp>;
      };
      mockSection.getApp = jest.fn().mockImplementation((id) => mockApps.get(id));
      const mockApps = new Map<string, jest.Mocked<ManagementApp>>([
        [usersManagementApp.id, getMockedApp(usersManagementApp.id)],
        [rolesManagementApp.id, getMockedApp(rolesManagementApp.id)],
        [apiKeysManagementApp.id, getMockedApp(apiKeysManagementApp.id)],
        [roleMappingsManagementApp.id, getMockedApp(roleMappingsManagementApp.id)],
      ] as Array<[string, jest.Mocked<ManagementApp>]>);

      service.start({
        capabilities: {
          management: {
            security: {
              users: canManageSecurity,
              roles: canManageSecurity,
              role_mappings: canManageSecurity,
              api_keys: canManageSecurity,
            },
          },
          navLinks: {},
          catalogue: {},
        },
        uiConfig,
      });

      return {
        mockApps,
        updateFeatures(features: Partial<SecurityLicenseFeatures>) {
          licenseSubject.next(features as unknown as SecurityLicenseFeatures);
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

    it('apps are disabled if capabilities are false', () => {
      const { mockApps } = startService(
        {
          showLinks: true,
          showRoleMappingsManagement: true,
        },
        false
      );
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
