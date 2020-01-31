/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock } from 'src/core/public/mocks';
import { SpacesPlugin } from './plugin';
import { homePluginMock } from '../../../../src/plugins/home/public/mocks';
import { managementPluginMock } from '../../../../src/plugins/management/public/mocks';

describe('Spaces plugin', () => {
  describe('#setup', () => {
    it('should register the space selector app', () => {
      const coreSetup = coreMock.createSetup();

      const plugin = new SpacesPlugin();
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

      const registerApp = jest.fn();

      const home = homePluginMock.createSetupContract();

      const management = managementPluginMock.createSetupContract();
      management.sections.getSection.mockReturnValue({ registerApp });

      const plugin = new SpacesPlugin();
      plugin.setup(coreSetup, {
        management,
        home,
      });

      expect(registerApp).toHaveBeenCalledWith(expect.objectContaining({ id: 'spaces' }));

      expect(home.featureCatalogue.register).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'admin',
          icon: 'spacesApp',
          id: 'spaces',
          showOnHomePage: true,
        })
      );
    });
  });

  describe('#start', () => {
    it('should register the spaces nav control', () => {
      const coreSetup = coreMock.createSetup();
      const coreStart = coreMock.createStart();

      const plugin = new SpacesPlugin();
      plugin.setup(coreSetup, {});

      plugin.start(coreStart, {});

      expect(coreStart.chrome.navControls.registerLeft).toHaveBeenCalled();
    });
  });
});
