/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { enforceOptions } from 'broadcast-channel';
import { Observable } from 'rxjs';

import type { CoreSetup } from 'src/core/public';
import { coreMock } from 'src/core/public/mocks';
import type { DataViewsPublicPluginStart } from 'src/plugins/data_views/public';
import { managementPluginMock } from 'src/plugins/management/public/mocks';

import type { FeaturesPluginStart } from '../../features/public';
import { licensingMock } from '../../licensing/public/mocks';
import { ManagementService } from './management';
import type { PluginStartDependencies } from './plugin';
import { SecurityPlugin } from './plugin';

describe('Security Plugin', () => {
  beforeAll(() => {
    enforceOptions({ type: 'simulate' });
  });
  afterAll(() => {
    enforceOptions(null);
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
          }
        )
      ).toEqual({
        authc: { getCurrentUser: expect.any(Function), areAPIKeysEnabled: expect.any(Function) },
        license: {
          isLicenseAvailable: expect.any(Function),
          isEnabled: expect.any(Function),
          getFeatures: expect.any(Function),
          hasAtLeast: expect.any(Function),
          features$: expect.any(Observable),
        },
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
        management: managementSetupMock,
      });

      expect(setupManagementServiceMock).toHaveBeenCalledTimes(1);
      expect(setupManagementServiceMock).toHaveBeenCalledWith({
        authc: { getCurrentUser: expect.any(Function), areAPIKeysEnabled: expect.any(Function) },
        license: {
          isLicenseAvailable: expect.any(Function),
          isEnabled: expect.any(Function),
          getFeatures: expect.any(Function),
          hasAtLeast: expect.any(Function),
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
        { licensing: licensingMock.createSetup() }
      );

      expect(
        plugin.start(coreMock.createStart({ basePath: '/some-base-path' }), {
          dataViews: {} as DataViewsPublicPluginStart,
          features: {} as FeaturesPluginStart,
        })
      ).toEqual({
        uiApi: {
          components: {
            getChangePassword: expect.any(Function),
            getPersonalInfo: expect.any(Function),
          },
        },
        authc: {
          getCurrentUser: expect.any(Function),
          areAPIKeysEnabled: expect.any(Function),
        },
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
          management: managementSetupMock,
        }
      );

      const coreStart = coreMock.createStart({ basePath: '/some-base-path' });
      plugin.start(coreStart, {
        dataViews: {} as DataViewsPublicPluginStart,
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
        { licensing: licensingMock.createSetup() }
      );

      expect(() => plugin.stop()).not.toThrow();
    });

    it('does not fail if called during normal plugin life cycle.', () => {
      const plugin = new SecurityPlugin(coreMock.createPluginInitializerContext());

      plugin.setup(
        coreMock.createSetup({ basePath: '/some-base-path' }) as CoreSetup<PluginStartDependencies>,
        { licensing: licensingMock.createSetup() }
      );

      plugin.start(coreMock.createStart({ basePath: '/some-base-path' }), {
        dataViews: {} as DataViewsPublicPluginStart,
        features: {} as FeaturesPluginStart,
      });

      expect(() => plugin.stop()).not.toThrow();
    });
  });
});
