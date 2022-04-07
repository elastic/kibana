/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import {
  Query,
  fromKueryExpression,
  toElasticsearchQuery,
  buildEsQuery,
  buildQueryFromFilters,
  DataViewBase,
} from '@kbn/es-query';
import { IUiSettingsClient } from 'kibana/public';
import { getEsQueryConfig } from '../../../../../../../../src/plugins/data/public';
import { SEARCH_QUERY_LANGUAGE } from '../../../../../common/constants/search';
import { SavedSearchSavedObject } from '../../../../../common/types/kibana';
import { getQueryFromSavedSearchObject } from '../../../util/index_utils';

// Provider for creating the items used for searching and job creation.

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
  indexPattern: DataViewBase | undefined,
  savedSearch: SavedSearchSavedObject | null
) {
  // query is only used by the data visualizer as it needs
  // a lucene query_string.
  // Using a blank query will cause match_all:{} to be used
  // when passed through luceneStringToDsl
  const query: Query = {
    query: '',
    language: 'lucene',
  };
  const combinedQuery: any = getDefaultDatafeedQuery();

  if (savedSearch === null) {
    return {
      query,
      combinedQuery,
    };
  }

  const data = getQueryFromSavedSearchObject(savedSearch);
  return createQueries(data, indexPattern, kibanaConfig);
}

export function createQueries(
  data: { query: Query; filter: any[] },
  indexPattern: DataViewBase | undefined,
  kibanaConfig: IUiSettingsClient
) {
  let query: Query = {
    query: '',
    language: 'lucene',
  };
  let combinedQuery: any = getDefaultDatafeedQuery();

  query = data.query;
  const filter = data.filter;
  const filters = Array.isArray(filter) ? filter : [];

  if (query.language === SEARCH_QUERY_LANGUAGE.KUERY) {
    const ast = fromKueryExpression(query.query);
    if (query.query !== '') {
      combinedQuery = toElasticsearchQuery(ast, indexPattern);
    }
    const filterQuery = buildQueryFromFilters(filters, indexPattern);

    if (combinedQuery.bool === undefined) {
      combinedQuery.bool = {};
      // toElasticsearchQuery may add a single multi_match item to the
      // root of its returned query, rather than putting it inside
      // a bool.should
      // in this case, move it to a bool.should
      if (combinedQuery.multi_match !== undefined) {
        combinedQuery.bool.should = {
          multi_match: combinedQuery.multi_match,
        };
        delete combinedQuery.multi_match;
      }
    }

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
    const esQueryConfigs = getEsQueryConfig(kibanaConfig);
    combinedQuery = buildEsQuery(indexPattern, [query], filters, esQueryConfigs);
  }

  return {
    query,
    combinedQuery,
  };
}

// Only model plot cardinality relevant
// format:[{id:"cardinality_model_plot_high",modelPlotCardinality:11405}, {id:"cardinality_partition_field",fieldName:"clientip"}]
interface CheckCardinalitySuccessResponse {
  success: boolean;
  highCardinality?: any;
}
export function checkCardinalitySuccess(data: any) {
  const response: CheckCardinalitySuccessResponse = {
    success: true,
  };
  // There were no fields to run cardinality on.
  if (Array.isArray(data) && data.length === 0) {
    return response;
  }

  for (let i = 0; i < data.length; i++) {
    if (data[i].id === 'success_cardinality') {
      break;
    }

    if (data[i].id === 'cardinality_model_plot_high') {
      response.success = false;
      response.highCardinality = data[i].modelPlotCardinality;
      break;
    }
  }

  return response;
}
