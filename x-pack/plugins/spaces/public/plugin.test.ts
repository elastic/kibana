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
    it('should register the space selector app when buildFlavor is traditional', () => {
      const coreSetup = coreMock.createSetup();
      const mockInitializerContext = coreMock.createPluginInitializerContext(
        {},
        { buildFlavor: 'traditional' }
      );

      const plugin = new SpacesPlugin(mockInitializerContext);
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

    it('should not register the space selector app when buildFlavor is serverless', () => {
      const coreSetup = coreMock.createSetup();

      const plugin = new SpacesPlugin(coreMock.createPluginInitializerContext());
      plugin.setup(coreSetup, {});

      expect(coreSetup.application.register).not.toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'space_selector',
          chromeless: true,
          appRoute: '/spaces/space_selector',
          mount: expect.any(Function),
        })
      );
    });

    it('should register the management and feature catalogue sections when the management and home plugins are both available when buildFlavor is traditional', () => {
      const coreSetup = coreMock.createSetup();
      const home = homePluginMock.createSetupContract();

      const management = managementPluginMock.createSetupContract();
      const mockSection = createManagementSectionMock();
      mockSection.registerApp = jest.fn();

      management.sections.section.kibana = mockSection;

      const mockInitializerContext = coreMock.createPluginInitializerContext(
        {},
        { buildFlavor: 'traditional' }
      );

      const plugin = new SpacesPlugin(mockInitializerContext);
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

    it('should not register spaces in the management plugin or the feature catalog when the management and home plugins are both available when buildFlavor is serverless', () => {
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

      expect(mockSection.registerApp).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: 'spaces' })
      );

      expect(home.featureCatalogue.register).not.toHaveBeenCalledWith(
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
    it('should register the spaces nav control when buildFlavor is traditional', () => {
      const coreSetup = coreMock.createSetup();
      const coreStart = coreMock.createStart();

      const mockInitializerContext = coreMock.createPluginInitializerContext(
        {},
        { buildFlavor: 'traditional' }
      );

      const plugin = new SpacesPlugin(mockInitializerContext);
      plugin.setup(coreSetup, {});

      plugin.start(coreStart);

      expect(coreStart.chrome.navControls.registerLeft).toHaveBeenCalled();
    });

    it('should not register the spaces nav control when buildFlavor is serverless', () => {
      const coreSetup = coreMock.createSetup();
      const coreStart = coreMock.createStart();

      const plugin = new SpacesPlugin(coreMock.createPluginInitializerContext());
      plugin.setup(coreSetup, {});

      plugin.start(coreStart);

      expect(coreStart.chrome.navControls.registerLeft).not.toHaveBeenCalled();
    });
  });

  it('determines hasOnlyDefaultSpace correctly when maxSpaces=1', () => {
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();

    const plugin = new SpacesPlugin(coreMock.createPluginInitializerContext({ maxSpaces: 1 }));
    const spacesSetup = plugin.setup(coreSetup, {});
    const spacesStart = plugin.start(coreStart);

    expect(spacesSetup.hasOnlyDefaultSpace).toBe(true);
    expect(spacesStart.hasOnlyDefaultSpace).toBe(true);
  });

  it('determines hasOnlyDefaultSpace correctly when maxSpaces=1000', () => {
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();

    const plugin = new SpacesPlugin(coreMock.createPluginInitializerContext({ maxSpaces: 1000 }));
    const spacesSetup = plugin.setup(coreSetup, {});
    const spacesStart = plugin.start(coreStart);

    expect(spacesSetup.hasOnlyDefaultSpace).toBe(false);
    expect(spacesStart.hasOnlyDefaultSpace).toBe(false);
  });
});
