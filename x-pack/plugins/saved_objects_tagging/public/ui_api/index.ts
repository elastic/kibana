/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { OverlayStart } from '../../../../../src/core/public/overlays/overlay_service';
import type {
  ITagsCache,
  SavedObjectsTaggingApiUi,
} from '../../../../../src/plugins/saved_objects_tagging_oss/public/api';
import type { TagsCapabilities } from '../../common/capabilities';
import { updateTagsReferences } from '../../common/references';
import type { ITagInternalClient } from '../services/tags/tags_client';
import { convertTagNameToId, getTag, getTagIdsFromReferences } from '../utils';
import { getComponents } from './components';
import { buildConvertNameToReference } from './convert_name_to_reference';
import { buildGetSearchBarFilter } from './get_search_bar_filter';
import { buildGetTableColumnDefinition } from './get_table_column_definition';
import { hasTagDecoration } from './has_tag_decoration';
import { buildParseSearchQuery } from './parse_search_query';

interface GetUiApiOptions {
  overlays: OverlayStart;
  capabilities: TagsCapabilities;
  cache: ITagsCache;
  client: ITagInternalClient;
}

export const getUiApi = ({
  cache,
  capabilities,
  client,
  overlays,
}: GetUiApiOptions): SavedObjectsTaggingApiUi => {
  const components = getComponents({ cache, capabilities, overlays, tagClient: client });

  return {
    components,
    getTableColumnDefinition: buildGetTableColumnDefinition({ components, cache }),
    getSearchBarFilter: buildGetSearchBarFilter({ cache }),
    parseSearchQuery: buildParseSearchQuery({ cache }),
    convertNameToReference: buildConvertNameToReference({ cache }),
    hasTagDecoration,
    getTagIdsFromReferences,
    getTagIdFromName: (tagName: string) => convertTagNameToId(tagName, cache.getState()),
    updateTagsReferences,
    getTag: (tagId: string) => getTag(tagId, cache.getState()),
  };
};
