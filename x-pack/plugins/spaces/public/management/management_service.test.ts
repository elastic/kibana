/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { ManagementSection } from '@kbn/management-plugin/public';
import { managementPluginMock } from '@kbn/management-plugin/public/mocks';

import type { PluginsStart } from '../plugin';
import { spacesManagerMock } from '../spaces_manager/mocks';
import { ManagementService } from './management_service';

describe('ManagementService', () => {
  describe('#setup', () => {
    it('registers the spaces management page under the kibana section', () => {
      const mockKibanaSection = {
        registerApp: jest.fn(),
      } as unknown as ManagementSection;
      const managementMockSetup = managementPluginMock.createSetupContract();
      managementMockSetup.sections.section.kibana = mockKibanaSection;
      const deps = {
        management: managementMockSetup,
        getStartServices: coreMock.createSetup()
          .getStartServices as CoreSetup<PluginsStart>['getStartServices'],
        spacesManager: spacesManagerMock.create(),
      };

      const service = new ManagementService();
      service.setup(deps);

      expect(mockKibanaSection.registerApp).toHaveBeenCalledTimes(1);
      expect(mockKibanaSection.registerApp).toHaveBeenCalledWith({
        id: 'spaces',
        title: 'Spaces',
        order: 2,
        mount: expect.any(Function),
      });
    });

    it('will not crash if the kibana section is missing', () => {
      const deps = {
        management: managementPluginMock.createSetupContract(),
        getStartServices: coreMock.createSetup()
          .getStartServices as CoreSetup<PluginsStart>['getStartServices'],
        spacesManager: spacesManagerMock.create(),
      };

      const service = new ManagementService();
      service.setup(deps);
    });
  });

  describe('#stop', () => {
    it('disables the spaces management page', () => {
      const mockSpacesManagementPage = { disable: jest.fn() };
      const mockKibanaSection = {
        registerApp: jest.fn().mockReturnValue(mockSpacesManagementPage),
      } as unknown as ManagementSection;
      const managementMockSetup = managementPluginMock.createSetupContract();
      managementMockSetup.sections.section.kibana = mockKibanaSection;

      const deps = {
        management: managementMockSetup,
        getStartServices: coreMock.createSetup()
          .getStartServices as CoreSetup<PluginsStart>['getStartServices'],
        spacesManager: spacesManagerMock.create(),
      };

      const service = new ManagementService();
      service.setup(deps);

      service.stop();

      expect(mockKibanaSection.registerApp).toHaveBeenCalledTimes(1);
      expect(mockSpacesManagementPage.disable).toHaveBeenCalledTimes(1);
    });
  });
});
