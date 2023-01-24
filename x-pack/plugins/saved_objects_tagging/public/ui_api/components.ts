/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OverlayStart, ThemeServiceStart } from '@kbn/core/public';
import { SavedObjectsTaggingApiUiComponent } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { TagsCapabilities } from '../../common';
import { ITagInternalClient, ITagsCache } from '../services';
import {
  getConnectedTagListComponent,
  getConnectedTagSelectorComponent,
  getConnectedSavedObjectModalTagSelectorComponent,
} from '../components/connected';
import { getCreateModalOpener } from '../components/edition_modal';

export interface GetComponentsOptions {
  capabilities: TagsCapabilities;
  cache: ITagsCache;
  overlays: OverlayStart;
  theme: ThemeServiceStart;
  tagClient: ITagInternalClient;
}

export const getComponents = ({
  capabilities,
  cache,
  overlays,
  theme,
  tagClient,
}: GetComponentsOptions): SavedObjectsTaggingApiUiComponent => {
  const openCreateModal = getCreateModalOpener({ overlays, theme, tagClient });
  return {
    TagList: getConnectedTagListComponent({ cache }),
    TagSelector: getConnectedTagSelectorComponent({ cache, capabilities, openCreateModal }),
    SavedObjectSaveModalTagSelector: getConnectedSavedObjectModalTagSelectorComponent({
      cache,
      capabilities,
      openCreateModal,
    }),
  };
};
