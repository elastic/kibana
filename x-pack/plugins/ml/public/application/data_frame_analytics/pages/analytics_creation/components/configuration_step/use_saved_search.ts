/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect } from 'react';
import { useMlContext } from '../../../../../contexts/ml';
import { esQuery, esKuery } from '../../../../../../../../../../src/plugins/data/public';
import { SEARCH_QUERY_LANGUAGE } from '../../../../../../../common/constants/search';
import { getQueryFromSavedSearch } from '../../../../../util/index_utils';

export function useSavedSearch() {
  const [savedSearchQuery, setSavedSearchQuery] = useState<any>(undefined);
  const [savedSearchQueryStr, setSavedSearchQueryStr] = useState<any>(undefined);

  const mlContext = useMlContext();
  const { currentSavedSearch, currentIndexPattern, kibanaConfig } = mlContext;

  const getQueryData = () => {
    let qry;
    let qryString;

    if (currentSavedSearch !== null) {
      const { query } = getQueryFromSavedSearch(currentSavedSearch);
      const queryLanguage = query.language as SEARCH_QUERY_LANGUAGE;
      qryString = query.query;

      if (queryLanguage === SEARCH_QUERY_LANGUAGE.KUERY) {
        const ast = esKuery.fromKueryExpression(qryString);
        qry = esKuery.toElasticsearchQuery(ast, currentIndexPattern);
      } else {
        qry = esQuery.luceneStringToDsl(qryString);
        esQuery.decorateQuery(qry, kibanaConfig.get('query:queryString:options'));
      }

      setSavedSearchQuery(qry);
      setSavedSearchQueryStr(qryString);
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
