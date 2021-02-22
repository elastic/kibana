/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsManagementPluginMock } from 'src/plugins/saved_objects_management/public/mocks';

import { CopyToSpaceSavedObjectsManagementAction } from './copy_saved_objects_to_space_action';
import { CopySavedObjectsToSpaceService } from './copy_saved_objects_to_space_service';

describe('CopySavedObjectsToSpaceService', () => {
  describe('#setup', () => {
    it('registers the CopyToSpaceSavedObjectsManagementAction', () => {
      const deps = {
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
