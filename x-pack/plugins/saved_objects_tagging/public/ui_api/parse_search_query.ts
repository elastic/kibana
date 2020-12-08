/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Query } from '@elastic/eui';
import { SavedObjectsFindOptionsReference } from 'src/core/public';
import {
  ParseSearchQueryOptions,
  SavedObjectsTaggingApiUi,
} from '../../../../../src/plugins/saved_objects_tagging_oss/public';
import { ITagsCache } from '../services';

export interface BuildParseSearchQueryOptions {
  cache: ITagsCache;
}

export const buildParseSearchQuery = ({
  cache,
}: BuildParseSearchQueryOptions): SavedObjectsTaggingApiUi['parseSearchQuery'] => {
  return (query: string, { tagField = 'tag', useName = true }: ParseSearchQueryOptions = {}) => {
    const parsed = Query.parse(query);
    // from other usages of `Query.parse` in the codebase, it seems that
    // for empty term, the parsed query can be undefined, even if the type def state otherwise.
    if (!query) {
      return {
        searchTerm: '',
        tagReferences: [],
      };
    }

    let searchTerm: string = '';
    let tagReferences: SavedObjectsFindOptionsReference[] = [];

    if (parsed.ast.getTermClauses().length) {
      searchTerm = parsed.ast
        .getTermClauses()
        .map((clause: any) => clause.value)
        .join(' ');
    }
    if (parsed.ast.getFieldClauses(tagField)) {
      const selectedTags = parsed.ast.getFieldClauses(tagField)[0].value as string[];
      if (useName) {
        selectedTags.forEach((tagName) => {
          const found = cache.getState().find((tag) => tag.name === tagName);
          if (found) {
            tagReferences.push({
              type: 'tag',
              id: found.id,
            });
          }
        });
      } else {
        tagReferences = selectedTags.map((tagId) => ({ type: 'tag', id: tagId }));
      }
    }

    return {
      searchTerm,
      tagReferences: tagReferences.length ? tagReferences : undefined,
    };
  };
};
