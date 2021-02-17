/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ShareToSpaceSavedObjectsManagementAction } from './share_saved_objects_to_space_action';
// import { ShareToSpaceSavedObjectsManagementColumn } from './share_saved_objects_to_space_column';
import { ShareSavedObjectsToSpaceService } from '.';
import { savedObjectsManagementPluginMock } from '../../../../../src/plugins/saved_objects_management/public/mocks';
import { uiApiMock } from '../ui_api/mocks';

describe('ShareSavedObjectsToSpaceService', () => {
  describe('#setup', () => {
    it('registers the ShareToSpaceSavedObjectsManagement Action and Column', () => {
      const deps = {
        savedObjectsManagementSetup: savedObjectsManagementPluginMock.createSetupContract(),
        spacesApiUi: uiApiMock.create(),
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
