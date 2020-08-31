/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CopyToSpaceSavedObjectsManagementAction } from './copy_saved_objects_to_space_action';
import { spacesManagerMock } from '../spaces_manager/mocks';
import { CopySavedObjectsToSpaceService } from '.';
import { notificationServiceMock } from 'src/core/public/mocks';
import { savedObjectsManagementPluginMock } from '../../../../../src/plugins/saved_objects_management/public/mocks';

describe('CopySavedObjectsToSpaceService', () => {
  describe('#setup', () => {
    it('registers the CopyToSpaceSavedObjectsManagementAction', () => {
      const deps = {
        spacesManager: spacesManagerMock.create(),
        notificationsSetup: notificationServiceMock.createSetupContract(),
        savedObjectsManagementSetup: savedObjectsManagementPluginMock.createSetupContract(),
      };

      const service = new CopySavedObjectsToSpaceService();
      service.setup(deps);

      expect(deps.savedObjectsManagementSetup.actions.register).toHaveBeenCalledTimes(1);
      expect(deps.savedObjectsManagementSetup.actions.register).toHaveBeenCalledWith(
        expect.any(CopyToSpaceSavedObjectsManagementAction)
      );
    });
  });
});
