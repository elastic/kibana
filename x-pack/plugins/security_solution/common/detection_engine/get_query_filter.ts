/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Filter,
  IIndexPattern,
  isFilterDisabled,
  buildEsQuery,
  EsQueryConfig,
} from '../../../../../src/plugins/data/common';
import {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '../../../lists/common/schemas';
import { buildExceptionListQueries } from './build_exceptions_query';
import { Query, Language, Index } from './schemas/common/schemas';

export const getQueryFilter = (
  query: Query,
  language: Language,
  filters: Array<Partial<Filter>>,
  index: Index,
  lists: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>,
  excludeExceptions: boolean = true
) => {
  const indexPattern: IIndexPattern = {
    fields: [],
    title: index.join(),
  };

  const config: EsQueryConfig = {
    allowLeadingWildcards: true,
    queryStringOptions: { analyze_wildcard: true },
    ignoreFilterIfFieldNotInIndex: false,
    dateFormatTZ: 'Zulu',
  };

  const enabledFilters = ((filters as unknown) as Filter[]).filter((f) => !isFilterDisabled(f));
  /*
   * Pinning exceptions to 'kuery' because lucene
   * does not support nested queries, while our exceptions
   * UI does, since we can pass both lucene and kql into
   * buildEsQuery, this allows us to offer nested queries
   * regardless
   */
  const exceptionQueries = buildExceptionListQueries({ language: 'kuery', lists });
  if (exceptionQueries.length > 0) {
    // Here we build a query with only the exceptions: it will put them all in the `filter` array
    // of the resulting object, which would AND the exceptions together. When creating exceptionFilter,
    // we move the `filter` array to `should` so they are OR'd together instead.
    // This gets around the problem with buildEsQuery not allowing callers to specify whether queries passed in
    // should be ANDed or ORed together.
    const exceptionQuery = buildEsQuery(indexPattern, exceptionQueries, [], config);
    const exceptionFilter: Filter = {
      meta: {
        alias: null,
        negate: excludeExceptions,
        disabled: false,
      },
      query: {
        bool: {
          should: exceptionQuery.bool.filter,
        },
      },
    };
    enabledFilters.push(exceptionFilter);
  }
  const initialQuery = { query, language };

  return buildEsQuery(indexPattern, initialQuery, enabledFilters, config);
};
