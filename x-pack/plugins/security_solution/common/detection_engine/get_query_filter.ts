/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Filter,
  Query,
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
import { Query as QueryString, Language, Index } from './schemas/common/schemas';

export const getQueryFilter = (
  query: QueryString,
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
    // Assume that `indices.query.bool.max_clause_count` is at least 1024 (the default value),
    // allowing us to make 1024-item chunks of exception list items.
    // Discussion at https://issues.apache.org/jira/browse/LUCENE-4835 indicates that 1024 is a
    // very conservative value.
    const exceptionFilter = buildExceptionFilter(
      exceptionQueries,
      indexPattern,
      config,
      excludeExceptions,
      1024
    );
    enabledFilters.push(exceptionFilter);
  }
  const initialQuery = { query, language };

  return buildEsQuery(indexPattern, initialQuery, enabledFilters, config);
};

export const buildExceptionFilter = (
  exceptionQueries: Query[],
  indexPattern: IIndexPattern,
  config: EsQueryConfig,
  excludeExceptions: boolean,
  chunkSize: number
) => {
  const exceptionFilter: Filter = {
    meta: {
      alias: null,
      negate: excludeExceptions,
      disabled: false,
    },
    query: {
      bool: {
        should: undefined,
      },
    },
  };
  if (exceptionQueries.length <= chunkSize) {
    const query = buildEsQuery(indexPattern, exceptionQueries, [], config);
    exceptionFilter.query.bool.should = query.bool.filter;
  } else {
    const chunkedFilters: Filter[] = [];
    for (let index = 0; index < exceptionQueries.length; index += chunkSize) {
      const exceptionQueriesChunk = exceptionQueries.slice(index, index + chunkSize);
      const esQueryChunk = buildEsQuery(indexPattern, exceptionQueriesChunk, [], config);
      const filterChunk: Filter = {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
        },
        query: {
          bool: {
            should: esQueryChunk.bool.filter,
          },
        },
      };
      chunkedFilters.push(filterChunk);
    }
    // Here we build a query with only the exceptions: it will put them all in the `filter` array
    // of the resulting object, which would AND the exceptions together. When creating exceptionFilter,
    // we move the `filter` array to `should` so they are OR'd together instead.
    // This gets around the problem with buildEsQuery not allowing callers to specify whether queries passed in
    // should be ANDed or ORed together.
    exceptionFilter.query.bool.should = buildEsQuery(
      indexPattern,
      [],
      chunkedFilters,
      config
    ).bool.filter;
  }
  return exceptionFilter;
};
