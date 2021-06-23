/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { IUiSettingsClient } from 'kibana/public';
import { SavedSearchSavedObject } from '../../../../common/types';
import { IndexPattern } from '../../../../../../../src/plugins/data/common/index_patterns/index_patterns';
import { SEARCH_QUERY_LANGUAGE, SearchQueryLanguage } from '../types/combined_query';
import { esKuery, esQuery, Query } from '../../../../../../../src/plugins/data/public';

export function getQueryFromSavedSearch(savedSearch: SavedSearchSavedObject) {
  const search = savedSearch.attributes.kibanaSavedObjectMeta as { searchSourceJSON: string };
  return JSON.parse(search.searchSourceJSON) as {
    query: Query;
    filter: any[];
  };
}

/**
 * Extract query data from the saved search object.
 */
export function extractSearchData(
  savedSearch: SavedSearchSavedObject | null,
  currentIndexPattern: IndexPattern,
  queryStringOptions: Record<string, any> | string
) {
  if (!savedSearch) {
    return undefined;
  }

  const { query: extractedQuery } = getQueryFromSavedSearch(savedSearch);
  const queryLanguage = extractedQuery.language as SearchQueryLanguage;
  const qryString = extractedQuery.query;
  let qry;
  if (queryLanguage === SEARCH_QUERY_LANGUAGE.KUERY) {
    const ast = esKuery.fromKueryExpression(qryString);
    qry = esKuery.toElasticsearchQuery(ast, currentIndexPattern);
  } else {
    qry = esQuery.luceneStringToDsl(qryString);
    esQuery.decorateQuery(qry, queryStringOptions);
  }
  return {
    searchQuery: qry,
    searchString: qryString,
    queryLanguage,
  };
}

const DEFAULT_QUERY = {
  bool: {
    must: [
      {
        match_all: {},
      },
    ],
  },
};

export function getDefaultDatafeedQuery() {
  return cloneDeep(DEFAULT_QUERY);
}

export function createSearchItems(
  kibanaConfig: IUiSettingsClient,
  indexPattern: IndexPattern | undefined,
  savedSearch: SavedSearchSavedObject | null
) {
  // query is only used by the data visualizer as it needs
  // a lucene query_string.
  // Using a blank query will cause match_all:{} to be used
  // when passed through luceneStringToDsl
  let query: Query = {
    query: '',
    language: 'lucene',
  };

  let combinedQuery: any = getDefaultDatafeedQuery();
  if (savedSearch !== null) {
    const data = getQueryFromSavedSearch(savedSearch);

    query = data.query;
    const filter = data.filter;

    const filters = Array.isArray(filter) ? filter : [];

    if (query.language === SEARCH_QUERY_LANGUAGE.KUERY) {
      const ast = esKuery.fromKueryExpression(query.query);
      if (query.query !== '') {
        combinedQuery = esKuery.toElasticsearchQuery(ast, indexPattern);
      }
      const filterQuery = esQuery.buildQueryFromFilters(filters, indexPattern);

      if (Array.isArray(combinedQuery.bool.filter) === false) {
        combinedQuery.bool.filter =
          combinedQuery.bool.filter === undefined ? [] : [combinedQuery.bool.filter];
      }

      if (Array.isArray(combinedQuery.bool.must_not) === false) {
        combinedQuery.bool.must_not =
          combinedQuery.bool.must_not === undefined ? [] : [combinedQuery.bool.must_not];
      }

      combinedQuery.bool.filter = [...combinedQuery.bool.filter, ...filterQuery.filter];
      combinedQuery.bool.must_not = [...combinedQuery.bool.must_not, ...filterQuery.must_not];
    } else {
      const esQueryConfigs = esQuery.getEsQueryConfig(kibanaConfig);
      combinedQuery = esQuery.buildEsQuery(indexPattern, [query], filters, esQueryConfigs);
    }
  }

  return {
    query,
    combinedQuery,
  };
}
