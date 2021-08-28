/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { OverlayStart } from '../../../../../src/core/public/overlays/overlay_service';
import type {
  ITagsCache,
  SavedObjectsTaggingApiUiComponent,
} from '../../../../../src/plugins/saved_objects_tagging_oss/public/api';
import type { TagsCapabilities } from '../../common/capabilities';
import { getConnectedSavedObjectModalTagSelectorComponent } from '../components/connected/saved_object_save_modal_tag_selector';
import { getConnectedTagListComponent } from '../components/connected/tag_list';
import { getConnectedTagSelectorComponent } from '../components/connected/tag_selector';
import { getCreateModalOpener } from '../components/edition_modal/open_modal';
import type { ITagInternalClient } from '../services/tags/tags_client';

export interface GetComponentsOptions {
  capabilities: TagsCapabilities;
  cache: ITagsCache;
  overlays: OverlayStart;
  tagClient: ITagInternalClient;
}

export const getComponents = ({
  capabilities,
  cache,
  overlays,
  tagClient,
}: GetComponentsOptions): SavedObjectsTaggingApiUiComponent => {
  const openCreateModal = getCreateModalOpener({ overlays, tagClient });
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
