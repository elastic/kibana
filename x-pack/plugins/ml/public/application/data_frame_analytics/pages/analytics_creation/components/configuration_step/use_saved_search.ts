/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import {
  buildEsQuery,
  buildQueryFromFilters,
  decorateQuery,
  Filter,
  fromKueryExpression,
  Query,
  toElasticsearchQuery,
} from '@kbn/es-query';
import { useMlContext } from '../../../../../contexts/ml';
import { SEARCH_QUERY_LANGUAGE } from '../../../../../../../common/constants/search';

// `undefined` is used for a non-initialized state
// `null` is set if no saved search is used
export type SavedSearchQuery = Record<string, any> | null | undefined;
export type SavedSearchQueryStr =
  | string
  | {
      [key: string]: any;
    }
  | null
  | undefined;

export function useSavedSearch() {
  const [savedSearchQuery, setSavedSearchQuery] = useState<SavedSearchQuery>(undefined);
  const [savedSearchQueryStr, setSavedSearchQueryStr] = useState<SavedSearchQueryStr>(undefined);

  const mlContext = useMlContext();
  const { currentDataView, kibanaConfig, selectedSavedSearch } = mlContext;

  const getQueryData = () => {
    let qry: any = {};
    let qryString;

    if (selectedSavedSearch) {
      // FIXME: Add support for AggregateQuery type #150091
      const query = selectedSavedSearch.searchSource.getField('query') as Query;
      const filter = (selectedSavedSearch.searchSource.getField('filter') ?? []) as Filter[];
      const queryLanguage = query.language;
      qryString = query.query;

      if (queryLanguage === SEARCH_QUERY_LANGUAGE.KUERY) {
        const ast = fromKueryExpression(qryString);
        qry = toElasticsearchQuery(ast, currentDataView);
        const filterQuery = buildQueryFromFilters(filter, currentDataView);
        if (qry.bool === undefined) {
          qry.bool = {};
          // toElasticsearchQuery may add a single match_all item to the
          // root of its returned query, rather than putting it inside
          // a bool.should
          // in this case, move it to a bool.should
          if (qry.match_all !== undefined) {
            qry.bool.should = {
              match_all: qry.match_all,
            };
            delete qry.match_all;
          }
        }

        if (Array.isArray(qry.bool.filter) === false) {
          qry.bool.filter = qry.bool.filter === undefined ? [] : [qry.bool.filter];
        }
        if (Array.isArray(qry.bool.must_not) === false) {
          qry.bool.must_not = qry.bool.must_not === undefined ? [] : [qry.bool.must_not];
        }
        qry.bool.filter = [...qry.bool.filter, ...filterQuery.filter];
        qry.bool.must_not = [...qry.bool.must_not, ...filterQuery.must_not];
      } else {
        qry = buildEsQuery(currentDataView, [query], filter);
        decorateQuery(qry, kibanaConfig.get('query:queryString:options'));
      }

      setSavedSearchQuery(qry);
      setSavedSearchQueryStr(qryString);
    } else {
      setSavedSearchQuery(null);
      setSavedSearchQueryStr(null);
    }
  };

  useEffect(() => {
    getQueryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    savedSearchQuery,
    savedSearchQueryStr,
  };
}
