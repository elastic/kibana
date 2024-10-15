/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Query } from '@elastic/eui';
import { getSearchTerm, getFieldValueMap, applyAliases } from './query_utils';
import { FilterValues, ParsedSearchParams } from './types';

const knownFilters = ['tag', 'type'];

const aliasMap = {
  tag: ['tags'],
  type: ['types'],
};

// Converts multi word types to phrases by wrapping them in quotes. Example: type:canvas workpad -> type:"canvas workpad"
const convertMultiwordTypesToPhrases = (term: string, multiWordTypes: string[]): string => {
  if (multiWordTypes.length === 0) {
    return term;
  }

  const typesPattern = multiWordTypes.join('|');
  const termReplaceRegex = new RegExp(
    `(type:|types:)\\s*([^"']*?)\\b((${typesPattern})\\b|[^\\s"']+)`,
    'gi'
  );

  const modifiedTerm = term.replace(termReplaceRegex, (_, typeKeyword, whitespace, typeValue) => {
    const trimmedTypeKeyword = `${typeKeyword}${whitespace.trim()}`;

    // Check if the term is already quoted and if so, return it as is
    if (/['"]/.test(typeValue)) {
      return `${trimmedTypeKeyword}${typeValue}`;
    }

    // Wrap the multiword type in quotes
    return `${trimmedTypeKeyword}"${typeValue}"`;
  });

  return modifiedTerm;
};

export const parseSearchParams = (term: string, searchableTypes: string[]): ParsedSearchParams => {
  const recognizedFields = knownFilters.concat(...Object.values(aliasMap));
  let query: Query;

  // Finds all multiword types that are separated by whitespace or hyphens
  const multiWordSearchableTypesWhitespaceSeperated = searchableTypes
    .filter((item) => /[ -]/.test(item))
    .map((item) => item.replace(/-/g, ' '));

  const modifiedTerm = convertMultiwordTypesToPhrases(
    term,
    multiWordSearchableTypesWhitespaceSeperated
  );

  try {
    query = Query.parse(modifiedTerm, {
      schema: { recognizedFields },
    });
  } catch (e) {
    // if the query fails to parse, we just perform the search against the raw search term.
    return {
      term,
      filters: {},
    };
  }

  const searchTerm = getSearchTerm(query);
  const filterValues = applyAliases(getFieldValueMap(query), aliasMap);

  const tags = filterValues.get('tag');
  const types = filterValues.get('type');

  return {
    term: searchTerm,
    filters: {
      tags: tags ? valuesToString(tags) : undefined,
      types: types ? valuesToString(types) : undefined,
    },
  };
};

const valuesToString = (raw: FilterValues): FilterValues<string> =>
  raw.map((value) => String(value));
