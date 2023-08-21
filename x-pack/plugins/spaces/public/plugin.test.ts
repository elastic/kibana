/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { homePluginMock } from '@kbn/home-plugin/public/mocks';
import {
  createManagementSectionMock,
  managementPluginMock,
} from '@kbn/management-plugin/public/mocks';

import { SpacesPlugin } from './plugin';
// import { ConfigSchema } from './config';

describe('Spaces plugin', () => {
  describe('#setup', () => {
    it('should register the spaces API and the space selector app', () => {
      const coreSetup = coreMock.createSetup();

      const plugin = new SpacesPlugin(coreMock.createPluginInitializerContext());
      plugin.setup(coreSetup, {});

      expect(coreSetup.application.register).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'space_selector',
          chromeless: true,
          appRoute: '/spaces/space_selector',
          mount: expect.any(Function),
        })
      );
    });

    it('should register the management and feature catalogue sections when the management and home plugins are both available', () => {
      const coreSetup = coreMock.createSetup();
      const home = homePluginMock.createSetupContract();

      const management = managementPluginMock.createSetupContract();
      const mockSection = createManagementSectionMock();
      mockSection.registerApp = jest.fn();

      management.sections.section.kibana = mockSection;

      const plugin = new SpacesPlugin(coreMock.createPluginInitializerContext());
      plugin.setup(coreSetup, {
        management,
        home,
      });

      expect(mockSection.registerApp).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'spaces' })
      );

      expect(home.featureCatalogue.register).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'admin',
          icon: 'spacesApp',
          id: 'spaces',
          showOnHomePage: false,
        })
      );
    });
  });

  describe('#start', () => {
    it('should register the spaces nav control', () => {
      const coreSetup = coreMock.createSetup();
      const coreStart = coreMock.createStart();

      const plugin = new SpacesPlugin(coreMock.createPluginInitializerContext());
      plugin.setup(coreSetup, {});

      plugin.start(coreStart);

      expect(coreStart.chrome.navControls.registerLeft).toHaveBeenCalled();
    });
  });
});
