/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ManagementSetup } from 'src/legacy/core_plugins/management/public';
import { NotificationsSetup } from 'src/core/public';
import { CopyToSpaceSavedObjectsManagementAction } from './copy_saved_objects_to_space_action';
import { SpacesManager } from '../spaces_manager';

interface SetupDeps {
  spacesManager: SpacesManager;
  managementSetup: Pick<ManagementSetup, 'savedObjects'>;
  notificationsSetup: NotificationsSetup;
}

export class CopySavedObjectsToSpaceService {
  public setup({ spacesManager, managementSetup, notificationsSetup }: SetupDeps) {
    const action = new CopyToSpaceSavedObjectsManagementAction(spacesManager, notificationsSetup);
    managementSetup.savedObjects.registry.register(action);
  }
}
