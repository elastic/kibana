/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ITagsCache } from '../../../../../src/plugins/saved_objects_tagging_oss/public';

interface GetSuggestionOptions {
  searchTerm: string;
  searchableTypes: string[];
  tagCache?: ITagsCache;
}

export interface SearchSuggestion {
  key: string;
  label: string;
  description: string;
  icon: string;
  suggestedSearch: string;
}

export const getSuggestions = ({
  searchTerm,
  searchableTypes,
  tagCache,
}: GetSuggestionOptions): SearchSuggestion[] => {
  const results: SearchSuggestion[] = [];

  const trimmedTerm = searchTerm.trim();

  if (searchableTypes.includes(trimmedTerm)) {
    results.push({
      key: '__type__suggestion__',
      label: `type: ${trimmedTerm}`,
      icon: 'tag',
      description: 'Filter by type',
      suggestedSearch: `type:${searchTerm}`, // TODO: escape if necessary
    });
  }

  if (tagCache && searchTerm) {
    const matchingTag = tagCache.getState().find((tag) => tag.name === trimmedTerm);
    if (matchingTag) {
      results.push({
        key: '__tag__suggestion__',
        label: `tag: ${matchingTag.name}`,
        icon: 'tag',
        description: 'Filter by tag name',
        suggestedSearch: `tag:${searchTerm}`, // TODO: escape if necessary
      });
    }
  }

  return results;
};
