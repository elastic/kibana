/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NotificationsSetup } from 'src/core/public';
import { SavedObjectsManagementPluginSetup } from 'src/plugins/saved_objects_management/public';
import { CopyToSpaceSavedObjectsManagementAction } from './copy_saved_objects_to_space_action';
import { SpacesManager } from '../spaces_manager';

interface SetupDeps {
  getSpacesManager: () => Promise<SpacesManager>;
  savedObjectsManagementSetup: SavedObjectsManagementPluginSetup;
  notificationsSetup: NotificationsSetup;
}

export class CopySavedObjectsToSpaceService {
  public setup({ getSpacesManager, savedObjectsManagementSetup, notificationsSetup }: SetupDeps) {
    const action = new CopyToSpaceSavedObjectsManagementAction(
      getSpacesManager,
      notificationsSetup
    );
    savedObjectsManagementSetup.actions.register(action);
  }
}
