/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsTaggingApiUi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { TagsCapabilities } from '../../common';
import { ITagInternalClient, ITagsCache } from '../services';
import { StartServices } from '../types';
import {
  convertTagNameToId,
  getTag,
  getTagIdsFromReferences,
  updateTagsReferences,
} from '../utils';
import { getComponents } from './components';
import { buildConvertNameToReference } from './convert_name_to_reference';
import { buildGetSearchBarFilter } from './get_search_bar_filter';
import { buildGetTableColumnDefinition } from './get_table_column_definition';
import { buildGetTagList } from './get_tag_list';
import { hasTagDecoration } from './has_tag_decoration';
import { buildParseSearchQuery } from './parse_search_query';

interface GetUiApiOptions extends StartServices {
  capabilities: TagsCapabilities;
  cache: ITagsCache;
  client: ITagInternalClient;
}

export const getUiApi = ({
  cache,
  capabilities,
  client,
  ...startServices
}: GetUiApiOptions): SavedObjectsTaggingApiUi => {
  const components = getComponents({
    ...startServices,
    cache,
    capabilities,
    tagClient: client,
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
