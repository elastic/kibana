/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StartServicesAccessor } from 'src/core/public';
import type { SpacesApiUiComponent } from '../../../../../src/plugins/spaces_oss/public';
import { PluginsStart } from '../plugin';
import { getShareToSpaceFlyoutComponent } from '../share_saved_objects_to_space';
import { getSpacesContextWrapper } from '../spaces_context';
import { SpacesManager } from '../spaces_manager';
import { getSpaceListComponent } from '../space_list';

export interface GetComponentsOptions {
  spacesManager: SpacesManager;
  getStartServices: StartServicesAccessor<PluginsStart>;
}

export const getComponents = ({
  spacesManager,
  getStartServices,
}: GetComponentsOptions): SpacesApiUiComponent => {
  return {
    SpacesContext: getSpacesContextWrapper({ spacesManager, getStartServices }),
    ShareToSpaceFlyout: getShareToSpaceFlyoutComponent(),
    SpaceList: getSpaceListComponent(),
  };
};
