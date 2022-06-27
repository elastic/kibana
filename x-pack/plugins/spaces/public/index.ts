/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SpacesPlugin } from './plugin';

export { getSpaceColor, getSpaceImageUrl, getSpaceInitials } from './space_avatar';

export type { SpacesPluginSetup, SpacesPluginStart } from './plugin';

export type { Space, GetAllSpacesPurpose, GetSpaceResult } from '../common';

export type { SpacesData, SpacesDataEntry, SpacesApi } from './types';

export type { SpacesManager } from './spaces_manager';

export type {
  CopyToSpaceFlyoutProps,
  CopyToSpaceSavedObjectTarget,
  CopySavedObjectsToSpaceResponse,
} from './copy_saved_objects_to_space';

export type {
  LegacyUrlConflictProps,
  EmbeddableLegacyUrlConflictProps,
  RedirectLegacyUrlParams,
} from './legacy_urls';

export type {
  ShareToSpaceFlyoutProps,
  ShareToSpaceSavedObjectTarget,
} from './share_saved_objects_to_space';

export type { SpaceAvatarProps } from './space_avatar';

export type { SpaceListProps } from './space_list';

export type { SpacesContextProps, SpacesReactContextValue } from './spaces_context';

export type { LazyComponentFn, SpacesApiUi, SpacesApiUiComponent } from './ui_api';

export const plugin = () => {
  return new SpacesPlugin();
};
