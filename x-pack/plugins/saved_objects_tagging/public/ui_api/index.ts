/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OverlayStart, ThemeServiceStart } from 'src/core/public';
import { SavedObjectsTaggingApiUi } from '../../../../../src/plugins/saved_objects_tagging_oss/public';
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
import { hasTagDecoration } from './has_tag_decoration';

interface GetUiApiOptions {
  overlays: OverlayStart;
  theme: ThemeServiceStart;
  capabilities: TagsCapabilities;
  cache: ITagsCache;
  client: ITagInternalClient;
}

export const getUiApi = ({
  cache,
  capabilities,
  client,
  overlays,
  theme,
}: GetUiApiOptions): SavedObjectsTaggingApiUi => {
  const components = getComponents({ cache, capabilities, overlays, theme, tagClient: client });

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
