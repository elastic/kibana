/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationsStart, OverlayStart, ThemeServiceStart } from '@kbn/core/public';
import { SavedObjectsTaggingApiUi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { TagsCapabilities } from '../../common';
import { ITagsCache, ITagInternalClient } from '../services';
import {
  getTagIdsFromReferences,
  updateTagsReferences,
  convertTagNameToId,
  getTag,
} from '../utils';
import { getComponents } from './components';
import { buildGetTableColumnDefinition } from './get_table_column_definition';
import { buildGetSearchBarFilter } from './get_search_bar_filter';
import { buildParseSearchQuery } from './parse_search_query';
import { buildConvertNameToReference } from './convert_name_to_reference';
import { buildGetTagList } from './get_tag_list';
import { hasTagDecoration } from './has_tag_decoration';

interface GetUiApiOptions {
  overlays: OverlayStart;
  theme: ThemeServiceStart;
  capabilities: TagsCapabilities;
  cache: ITagsCache;
  client: ITagInternalClient;
  notifications: NotificationsStart;
}

export const getUiApi = ({
  cache,
  capabilities,
  client,
  overlays,
  theme,
  notifications,
}: GetUiApiOptions): SavedObjectsTaggingApiUi => {
  const components = getComponents({
    cache,
    capabilities,
    overlays,
    theme,
    tagClient: client,
    notifications,
  });

  const getTagList = buildGetTagList(cache);

  return {
    components,
    getTableColumnDefinition: buildGetTableColumnDefinition({ components, cache }),
    getSearchBarFilter: buildGetSearchBarFilter({ getTagList }),
    parseSearchQuery: buildParseSearchQuery({ cache }),
    convertNameToReference: buildConvertNameToReference({ cache }),
    hasTagDecoration,
    getTagIdsFromReferences,
    getTagIdFromName: (tagName: string) => convertTagNameToId(tagName, cache.getState()),
    updateTagsReferences,
    getTag: (tagId: string) => getTag(tagId, cache.getState()),
    getTagList,
  };
};
