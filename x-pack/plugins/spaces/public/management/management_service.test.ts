/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ManagementService } from '.';
import { coreMock } from 'src/core/public/mocks';
import { spacesManagerMock } from '../spaces_manager/mocks';
import { managementPluginMock } from '../../../../../src/plugins/management/public/mocks';
import { ManagementSection } from 'src/plugins/management/public';
import { Capabilities } from 'kibana/public';

describe('ManagementService', () => {
  describe('#setup', () => {
    it('registers the spaces management page under the kibana section', () => {
      const mockKibanaSection = ({
        registerApp: jest.fn(),
      } as unknown) as ManagementSection;
      const deps = {
        management: managementPluginMock.createSetupContract(),
        getStartServices: coreMock.createSetup().getStartServices,
        spacesManager: spacesManagerMock.create(),
      };

      deps.management.sections.getSection.mockReturnValue(mockKibanaSection);

      const service = new ManagementService();
      service.setup(deps);

      expect(deps.management.sections.getSection).toHaveBeenCalledTimes(1);
      expect(deps.management.sections.getSection).toHaveBeenCalledWith('kibana');

      expect(mockKibanaSection.registerApp).toHaveBeenCalledTimes(1);
      expect(mockKibanaSection.registerApp).toHaveBeenCalledWith({
        id: 'spaces',
        title: 'Spaces',
        order: 10,
        mount: expect.any(Function),
      });
    });

    it('will not crash if the kibana section is missing', () => {
      const deps = {
        management: managementPluginMock.createSetupContract(),
        getStartServices: coreMock.createSetup().getStartServices,
        spacesManager: spacesManagerMock.create(),
      };

      const service = new ManagementService();
      service.setup(deps);
    });
  });

  describe('#start', () => {
    it('disables the spaces management page if the user is not authorized', () => {
      const mockSpacesManagementPage = { disable: jest.fn() };
      const mockKibanaSection = ({
        registerApp: jest.fn().mockReturnValue(mockSpacesManagementPage),
      } as unknown) as ManagementSection;

      const deps = {
        management: managementPluginMock.createSetupContract(),
        getStartServices: coreMock.createSetup().getStartServices,
        spacesManager: spacesManagerMock.create(),
      };

      deps.management.sections.getSection.mockImplementation(id => {
        if (id === 'kibana') return mockKibanaSection;
        throw new Error(`unexpected getSection call: ${id}`);
      });

      const service = new ManagementService();
      service.setup(deps);

      const capabilities = ({ spaces: { manage: false } } as unknown) as Capabilities;
      service.start({ capabilities });

      expect(mockKibanaSection.registerApp).toHaveBeenCalledTimes(1);
      expect(mockSpacesManagementPage.disable).toHaveBeenCalledTimes(1);
    });

    it('does not disable the spaces management page if the user is authorized', () => {
      const mockSpacesManagementPage = { disable: jest.fn() };
      const mockKibanaSection = ({
        registerApp: jest.fn().mockReturnValue(mockSpacesManagementPage),
      } as unknown) as ManagementSection;

      const deps = {
        management: managementPluginMock.createSetupContract(),
        getStartServices: coreMock.createSetup().getStartServices,
        spacesManager: spacesManagerMock.create(),
      };

      deps.management.sections.getSection.mockImplementation(id => {
        if (id === 'kibana') return mockKibanaSection;
        throw new Error(`unexpected getSection call: ${id}`);
      });

      const service = new ManagementService();
      service.setup(deps);

      const capabilities = ({ spaces: { manage: true } } as unknown) as Capabilities;
      service.start({ capabilities });

      expect(mockKibanaSection.registerApp).toHaveBeenCalledTimes(1);
      expect(mockSpacesManagementPage.disable).toHaveBeenCalledTimes(0);
    });
  });

  describe('#stop', () => {
    it('disables the spaces management page', () => {
      const mockSpacesManagementPage = { disable: jest.fn() };
      const mockKibanaSection = ({
        registerApp: jest.fn().mockReturnValue(mockSpacesManagementPage),
      } as unknown) as ManagementSection;

      const deps = {
        management: managementPluginMock.createSetupContract(),
        getStartServices: coreMock.createSetup().getStartServices,
        spacesManager: spacesManagerMock.create(),
      };

      deps.management.sections.getSection.mockImplementation(id => {
        if (id === 'kibana') return mockKibanaSection;
        throw new Error(`unexpected getSection call: ${id}`);
      });

      const service = new ManagementService();
      service.setup(deps);

      service.stop();

      expect(mockKibanaSection.registerApp).toHaveBeenCalledTimes(1);
      expect(mockSpacesManagementPage.disable).toHaveBeenCalledTimes(1);
    });
  });
});
