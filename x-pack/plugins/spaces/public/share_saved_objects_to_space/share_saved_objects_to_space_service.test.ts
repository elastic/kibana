/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ShareToSpaceSavedObjectsManagementAction } from './share_saved_objects_to_space_action';
// import { ShareToSpaceSavedObjectsManagementColumn } from './share_saved_objects_to_space_column';
import { spacesManagerMock } from '../spaces_manager/mocks';
import { ShareSavedObjectsToSpaceService } from '.';
import { notificationServiceMock } from 'src/core/public/mocks';
import { savedObjectsManagementPluginMock } from '../../../../../src/plugins/saved_objects_management/public/mocks';

describe('ShareSavedObjectsToSpaceService', () => {
  describe('#setup', () => {
    it('registers the ShareToSpaceSavedObjectsManagement Action and Column', () => {
      const deps = {
        spacesManager: spacesManagerMock.create(),
        notificationsSetup: notificationServiceMock.createSetupContract(),
        savedObjectsManagementSetup: savedObjectsManagementPluginMock.createSetupContract(),
      };

      const service = new ShareSavedObjectsToSpaceService();
      service.setup(deps);

      expect(deps.savedObjectsManagementSetup.actions.register).toHaveBeenCalledTimes(1);
      expect(deps.savedObjectsManagementSetup.actions.register).toHaveBeenCalledWith(
        expect.any(ShareToSpaceSavedObjectsManagementAction)
      );

      // expect(deps.savedObjectsManagementSetup.columns.register).toHaveBeenCalledTimes(1);
      // expect(deps.savedObjectsManagementSetup.columns.register).toHaveBeenCalledWith(
      //   expect.any(ShareToSpaceSavedObjectsManagementColumn)
      // );
      expect(deps.savedObjectsManagementSetup.columns.register).not.toHaveBeenCalled(); // ensure this test fails after column code is uncommented
    });
  });
});
