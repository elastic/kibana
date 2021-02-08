/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsManagementPluginSetup } from 'src/plugins/saved_objects_management/public';
import type { SpacesApiUi } from '../../../../../src/plugins/spaces_oss/public';
import { ShareToSpaceSavedObjectsManagementAction } from './share_saved_objects_to_space_action';
// import { ShareToSpaceSavedObjectsManagementColumn } from './share_saved_objects_to_space_column';

interface SetupDeps {
  savedObjectsManagementSetup: SavedObjectsManagementPluginSetup;
  spacesApiUi: SpacesApiUi;
}

export class ShareSavedObjectsToSpaceService {
  public setup({ savedObjectsManagementSetup, spacesApiUi }: SetupDeps) {
    const action = new ShareToSpaceSavedObjectsManagementAction(spacesApiUi);
    savedObjectsManagementSetup.actions.register(action);
    // Note: this column is hidden for now because no saved objects are shareable. It should be uncommented when at least one saved object type is multi-namespace.
    // const column = new ShareToSpaceSavedObjectsManagementColumn(spacesApiUi);
    // savedObjectsManagementSetup.columns.register(column);
  }
}
