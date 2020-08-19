/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NotificationsSetup } from 'src/core/public';
import { SavedObjectsManagementPluginSetup } from 'src/plugins/saved_objects_management/public';
import { ShareToSpaceSavedObjectsManagementAction } from './share_saved_objects_to_space_action';
import { ShareToSpaceSavedObjectsManagementColumn } from './share_saved_objects_to_space_column';
import { SpacesManager } from '../spaces_manager';

interface SetupDeps {
  spacesManager: SpacesManager;
  savedObjectsManagementSetup: SavedObjectsManagementPluginSetup;
  notificationsSetup: NotificationsSetup;
}

export class ShareSavedObjectsToSpaceService {
  public setup({ spacesManager, savedObjectsManagementSetup, notificationsSetup }: SetupDeps) {
    const action = new ShareToSpaceSavedObjectsManagementAction(spacesManager, notificationsSetup);
    const column = new ShareToSpaceSavedObjectsManagementColumn(spacesManager);
    savedObjectsManagementSetup.actions.register(action);
    savedObjectsManagementSetup.columns.register(column);
  }
}
