/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import {
  decorateQuery,
  fromKueryExpression,
  luceneStringToDsl,
  toElasticsearchQuery,
} from '@kbn/es-query';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { useMlContext } from '../../../../../contexts/ml';
import { SEARCH_QUERY_LANGUAGE } from '../../../../../../../common/constants/search';
import { getQueryFromSavedSearchObject } from '../../../../../util/index_utils';

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
  const { currentSavedSearch, currentDataView, kibanaConfig } = mlContext;

  const getQueryData = () => {
    let qry: estypes.QueryDslQueryContainer = {};
    let qryString;

    if (currentSavedSearch !== null) {
      const { query } = getQueryFromSavedSearchObject(currentSavedSearch);
      const queryLanguage = query.language;
      qryString = query.query;

      if (queryLanguage === SEARCH_QUERY_LANGUAGE.KUERY) {
        const ast = fromKueryExpression(qryString);
        qry = toElasticsearchQuery(ast, currentDataView);
      } else {
        qry = luceneStringToDsl(qryString);
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
  }, []);

  return {
    savedSearchQuery,
    savedSearchQueryStr,
  };
}
