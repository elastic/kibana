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
import { PluginsStart } from '../plugin';
import { CoreSetup } from 'src/core/public';

describe('ManagementService', () => {
  describe('#setup', () => {
    it('registers the spaces management page under the kibana section', () => {
      const mockKibanaSection = ({
        registerApp: jest.fn(),
      } as unknown) as ManagementSection;
      const managementMockSetup = managementPluginMock.createSetupContract();
      managementMockSetup.sections.section.kibana = mockKibanaSection;
      const deps = {
        management: managementMockSetup,
        getStartServices: coreMock.createSetup().getStartServices as CoreSetup<
          PluginsStart
        >['getStartServices'],
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
        getStartServices: coreMock.createSetup().getStartServices as CoreSetup<
          PluginsStart
        >['getStartServices'],
        spacesManager: spacesManagerMock.create(),
      };

      const service = new ManagementService();
      service.setup(deps);
    });
  });

  describe('#stop', () => {
    it('disables the spaces management page', () => {
      const mockSpacesManagementPage = { disable: jest.fn() };
      const mockKibanaSection = ({
        registerApp: jest.fn().mockReturnValue(mockSpacesManagementPage),
      } as unknown) as ManagementSection;
      const managementMockSetup = managementPluginMock.createSetupContract();
      managementMockSetup.sections.section.kibana = mockKibanaSection;

      const deps = {
        management: managementMockSetup,
        getStartServices: coreMock.createSetup().getStartServices as CoreSetup<
          PluginsStart
        >['getStartServices'],
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
