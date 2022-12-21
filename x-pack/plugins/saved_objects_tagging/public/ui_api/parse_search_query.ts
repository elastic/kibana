/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import { first } from 'rxjs/operators';
import { Query } from '@elastic/eui';
import { SavedObjectsFindOptionsReference } from '@kbn/core/public';
import {
  ParseSearchQueryOptions,
  SavedObjectsTaggingApiUi,
} from '@kbn/saved-objects-tagging-oss-plugin/public';
import { ITagsCache } from '../services';

export interface BuildParseSearchQueryOptions {
  cache: ITagsCache;
}

export const buildParseSearchQuery = ({
  cache,
}: BuildParseSearchQueryOptions): SavedObjectsTaggingApiUi['parseSearchQuery'] => {
  return async (
    query: string,
    { tagField = 'tag', useName = true }: ParseSearchQueryOptions = {}
  ) => {
    let parsed: Query;

    try {
      parsed = Query.parse(query);
    } catch (e) {
      return {
        searchTerm: query,
        tagReferences: [],
        tagReferencesToExclude: [],
        valid: false,
      };
    }

    // from other usages of `Query.parse` in the codebase, it seems that
    // for empty term, the parsed query can be undefined, even if the type def state otherwise.
    if (!query) {
      return {
        searchTerm: '',
        tagReferences: [],
        tagReferencesToExclude: [],
        valid: true,
      };
    }

    let searchTerm: string = '';

    if (parsed.ast.getTermClauses().length) {
      searchTerm = parsed.ast
        .getTermClauses()
        .map((clause: any) => clause.value)
        .join(' ');
    }

    let tagReferences: SavedObjectsFindOptionsReference[] = [];
    let tagReferencesToExclude: SavedObjectsFindOptionsReference[] = [];

    if (parsed.ast.getFieldClauses(tagField)) {
      // The query can have clauses that either *must* match or *must_not* match
      // We will retrieve the list of name for both list and convert them to references
      const { selectedTags, excludedTags } = parsed.ast.getFieldClauses(tagField).reduce(
        (acc, clause) => {
          if (clause.match === 'must') {
            acc.selectedTags = clause.value as string[];
          } else if (clause.match === 'must_not') {
            acc.excludedTags = clause.value as string[];
          }

          return acc;
        },
        { selectedTags: [], excludedTags: [] } as { selectedTags: string[]; excludedTags: string[] }
      );

      const tagsInCache = await lastValueFrom(
        cache.getState$({ waitForInitialization: true }).pipe(first())
      );

      const tagsToReferences = (tagNames: string[]) => {
        if (useName) {
          const references: SavedObjectsFindOptionsReference[] = [];
          tagNames.forEach((tagName) => {
            const found = tagsInCache.find((tag) => tag.name === tagName);
            if (found) {
              references.push({
                type: 'tag',
                id: found.id,
              });
            }
          });
          return references;
        } else {
          return tagNames.map((tagId) => ({ type: 'tag', id: tagId }));
        }
      };

      tagReferences = tagsToReferences(selectedTags);
      tagReferencesToExclude = tagsToReferences(excludedTags);
    }

    return {
      searchTerm,
      tagReferences,
      tagReferencesToExclude,
      valid: true,
    };
  };
};
