/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from 'src/core/public';
import type { SavedObjectsManagementPluginSetup } from 'src/plugins/saved_objects_management/public';

import type { PluginsStart } from '../plugin';
import { CopyToSpaceSavedObjectsManagementAction } from './copy_saved_objects_to_space_action';

interface SetupDeps {
  savedObjectsManagementSetup: SavedObjectsManagementPluginSetup;
  getStartServices: StartServicesAccessor<PluginsStart>;
}

export class CopySavedObjectsToSpaceService {
  public setup({ savedObjectsManagementSetup, getStartServices }: SetupDeps) {
    const action = new CopyToSpaceSavedObjectsManagementAction(getStartServices);
    savedObjectsManagementSetup.actions.register(action);
  }
}
