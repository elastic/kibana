/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from 'src/core/public';
import type { SpacesApiUiComponent } from 'src/plugins/spaces_oss/public';

import type { PluginsStart } from '../plugin';
import {
  getLegacyUrlConflict,
  getShareToSpaceFlyoutComponent,
} from '../share_saved_objects_to_space';
import { getSpaceListComponent } from '../space_list';
import { getSpacesContextWrapper } from '../spaces_context';
import type { SpacesManager } from '../spaces_manager';

export interface GetComponentsOptions {
  spacesManager: SpacesManager;
  getStartServices: StartServicesAccessor<PluginsStart>;
}

export const getComponents = ({
  spacesManager,
  getStartServices,
}: GetComponentsOptions): SpacesApiUiComponent => {
  return {
    getSpacesContext: lazy(() => getSpacesContextWrapper({ spacesManager, getStartServices })),
    getShareToSpaceFlyout: lazy(getShareToSpaceFlyoutComponent),
    getSpaceList: lazy(getSpaceListComponent),
    getLegacyUrlConflict: lazy(() => getLegacyUrlConflict({ getStartServices })),
  };
};

/**
 * Returns a lazy-loadable version of a component. React expects these to be default exports.
 */
function lazy<T>(fn: () => React.FunctionComponent<T>) {
  return () => Promise.resolve({ default: fn() });
}
