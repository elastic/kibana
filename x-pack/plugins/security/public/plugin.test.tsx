/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import BroadcastChannel from 'broadcast-channel';
import { CoreSetup } from 'src/core/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { mockSecurityOssPlugin } from '../../../../src/plugins/security_oss/public/mocks';
import { SessionTimeout } from './session';
import { PluginStartDependencies, SecurityPlugin } from './plugin';

import { coreMock } from '../../../../src/core/public/mocks';
import { managementPluginMock } from '../../../../src/plugins/management/public/mocks';
import { licensingMock } from '../../licensing/public/mocks';
import { ManagementService } from './management';
import { FeaturesPluginStart } from '../../features/public';

describe('Security Plugin', () => {
  beforeAll(() => {
    BroadcastChannel.enforceOptions({ type: 'simulate' });
  });
  afterAll(() => {
    BroadcastChannel.enforceOptions(null);
  });

  describe('#setup', () => {
    it('should be able to setup if optional plugins are not available', () => {
      const plugin = new SecurityPlugin(coreMock.createPluginInitializerContext());
      expect(
        plugin.setup(
          coreMock.createSetup({
            basePath: '/some-base-path',
          }) as CoreSetup<PluginStartDependencies>,
          {
            licensing: licensingMock.createSetup(),
            securityOss: mockSecurityOssPlugin.createSetup(),
          }
        )
      ).toEqual({
        __legacyCompat: { logoutUrl: '/some-base-path/logout', tenant: '/some-base-path' },
        authc: { getCurrentUser: expect.any(Function), areAPIKeysEnabled: expect.any(Function) },
        license: {
          isLicenseAvailable: expect.any(Function),
          isEnabled: expect.any(Function),
          getType: expect.any(Function),
          getFeatures: expect.any(Function),
          features$: expect.any(Observable),
        },
        sessionTimeout: expect.any(SessionTimeout),
      });
    });

    it('setups Management Service if `management` plugin is available', () => {
      const coreSetupMock = coreMock.createSetup({ basePath: '/some-base-path' });
      const setupManagementServiceMock = jest
        .spyOn(ManagementService.prototype, 'setup')
        .mockImplementation(() => {});
      const managementSetupMock = managementPluginMock.createSetupContract();

      const plugin = new SecurityPlugin(coreMock.createPluginInitializerContext());

      plugin.setup(coreSetupMock as CoreSetup<PluginStartDependencies>, {
        licensing: licensingMock.createSetup(),
        securityOss: mockSecurityOssPlugin.createSetup(),
        management: managementSetupMock,
      });

      expect(setupManagementServiceMock).toHaveBeenCalledTimes(1);
      expect(setupManagementServiceMock).toHaveBeenCalledWith({
        authc: { getCurrentUser: expect.any(Function), areAPIKeysEnabled: expect.any(Function) },
        license: {
          isLicenseAvailable: expect.any(Function),
          isEnabled: expect.any(Function),
          getType: expect.any(Function),
          getFeatures: expect.any(Function),
          features$: expect.any(Observable),
        },
        management: managementSetupMock,
        fatalErrors: coreSetupMock.fatalErrors,
        getStartServices: coreSetupMock.getStartServices,
      });
    });
  });

  describe('#start', () => {
    it('should be able to setup if optional plugins are not available', () => {
      const plugin = new SecurityPlugin(coreMock.createPluginInitializerContext());
      plugin.setup(
        coreMock.createSetup({ basePath: '/some-base-path' }) as CoreSetup<PluginStartDependencies>,
        { licensing: licensingMock.createSetup(), securityOss: mockSecurityOssPlugin.createSetup() }
      );

      expect(
        plugin.start(coreMock.createStart({ basePath: '/some-base-path' }), {
          securityOss: mockSecurityOssPlugin.createStart(),
          data: {} as DataPublicPluginStart,
          features: {} as FeaturesPluginStart,
        })
      ).toEqual({
        navControlService: {
          getUserMenuLinks$: expect.any(Function),
          addUserMenuLinks: expect.any(Function),
        },
      });
    });

    it('starts Management Service if `management` plugin is available', () => {
      jest.spyOn(ManagementService.prototype, 'setup').mockImplementation(() => {});
      const startManagementServiceMock = jest
        .spyOn(ManagementService.prototype, 'start')
        .mockImplementation(() => {});
      const managementSetupMock = managementPluginMock.createSetupContract();
      const managementStartMock = managementPluginMock.createStartContract();

      const plugin = new SecurityPlugin(coreMock.createPluginInitializerContext());

      plugin.setup(
        coreMock.createSetup({ basePath: '/some-base-path' }) as CoreSetup<PluginStartDependencies>,
        {
          licensing: licensingMock.createSetup(),
          securityOss: mockSecurityOssPlugin.createSetup(),
          management: managementSetupMock,
        }
      );

      const coreStart = coreMock.createStart({ basePath: '/some-base-path' });
      plugin.start(coreStart, {
        securityOss: mockSecurityOssPlugin.createStart(),
        data: {} as DataPublicPluginStart,
        features: {} as FeaturesPluginStart,
        management: managementStartMock,
      });

      expect(startManagementServiceMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('#stop', () => {
    it('does not fail if called before `start`.', () => {
      const plugin = new SecurityPlugin(coreMock.createPluginInitializerContext());
      plugin.setup(
        coreMock.createSetup({ basePath: '/some-base-path' }) as CoreSetup<PluginStartDependencies>,
        { licensing: licensingMock.createSetup(), securityOss: mockSecurityOssPlugin.createSetup() }
      );

      expect(() => plugin.stop()).not.toThrow();
    });

    it('does not fail if called during normal plugin life cycle.', () => {
      const plugin = new SecurityPlugin(coreMock.createPluginInitializerContext());

      plugin.setup(
        coreMock.createSetup({ basePath: '/some-base-path' }) as CoreSetup<PluginStartDependencies>,
        { licensing: licensingMock.createSetup(), securityOss: mockSecurityOssPlugin.createSetup() }
      );

      plugin.start(coreMock.createStart({ basePath: '/some-base-path' }), {
        securityOss: mockSecurityOssPlugin.createStart(),
        data: {} as DataPublicPluginStart,
        features: {} as FeaturesPluginStart,
      });

      expect(() => plugin.stop()).not.toThrow();
    });
  });
});
