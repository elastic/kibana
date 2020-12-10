/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OverlayStart } from 'src/core/public';
import { SavedObjectsTaggingApiUi } from '../../../../../src/plugins/saved_objects_tagging_oss/public';
import { TagsCapabilities } from '../../common';
import { ITagsCache, ITagInternalClient } from '../services';
import { getTagIdsFromReferences, updateTagsReferences, convertTagNameToId } from '../utils';
import { getComponents } from './components';
import { buildGetTableColumnDefinition } from './get_table_column_definition';
import { buildGetSearchBarFilter } from './get_search_bar_filter';
import { buildParseSearchQuery } from './parse_search_query';
import { buildConvertNameToReference } from './convert_name_to_reference';
import { hasTagDecoration } from './has_tag_decoration';

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
  };
};
