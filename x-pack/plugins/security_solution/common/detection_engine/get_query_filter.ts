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
import { ESBoolQuery } from '../typed_json';
import { buildExceptionListQueries } from './build_exceptions_query';
import {
  Query as QueryString,
  Language,
  Index,
  TimestampOverrideOrUndefined,
} from './schemas/common/schemas';

export const getQueryFilter = (
  query: QueryString,
  language: Language,
  filters: Array<Partial<Filter>>,
  index: Index,
  lists: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>,
  excludeExceptions: boolean = true
): ESBoolQuery => {
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
  // Assume that `indices.query.bool.max_clause_count` is at least 1024 (the default value),
  // allowing us to make 1024-item chunks of exception list items.
  // Discussion at https://issues.apache.org/jira/browse/LUCENE-4835 indicates that 1024 is a
  // very conservative value.
  const exceptionFilter = buildExceptionFilter({
    lists,
    config,
    excludeExceptions,
    chunkSize: 1024,
    indexPattern,
  });
  if (exceptionFilter !== undefined) {
    enabledFilters.push(exceptionFilter);
  }
  const initialQuery = { query, language };

  return buildEsQuery(indexPattern, initialQuery, enabledFilters, config);
};

interface EqlSearchRequest {
  method: string;
  path: string;
  body: object;
  event_category_field?: string;
}

export const buildEqlSearchRequest = (
  query: string,
  index: string[],
  from: string,
  to: string,
  size: number,
  timestampOverride: TimestampOverrideOrUndefined,
  exceptionLists: ExceptionListItemSchema[],
  eventCategoryOverride: string | undefined
): EqlSearchRequest => {
  const timestamp = timestampOverride ?? '@timestamp';
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
  // Assume that `indices.query.bool.max_clause_count` is at least 1024 (the default value),
  // allowing us to make 1024-item chunks of exception list items.
  // Discussion at https://issues.apache.org/jira/browse/LUCENE-4835 indicates that 1024 is a
  // very conservative value.
  const exceptionFilter = buildExceptionFilter({
    lists: exceptionLists,
    config,
    excludeExceptions: true,
    chunkSize: 1024,
    indexPattern,
  });
  const indexString = index.join();
  const requestFilter: unknown[] = [
    {
      range: {
        [timestamp]: {
          gte: from,
          lte: to,
          format: 'strict_date_optional_time',
        },
      },
    },
  ];
  if (exceptionFilter !== undefined) {
    requestFilter.push({
      bool: {
        must_not: {
          bool: exceptionFilter?.query.bool,
        },
      },
    });
  }
  const baseRequest = {
    method: 'POST',
    path: `/${indexString}/_eql/search?allow_no_indices=true`,
    body: {
      size,
      query,
      filter: {
        bool: {
          filter: requestFilter,
        },
      },
    },
  };
  if (eventCategoryOverride) {
    return {
      ...baseRequest,
      event_category_field: eventCategoryOverride,
    };
  } else {
    return baseRequest;
  }
};

export const buildExceptionFilter = ({
  lists,
  config,
  excludeExceptions,
  chunkSize,
  indexPattern,
}: {
  lists: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>;
  config: EsQueryConfig;
  excludeExceptions: boolean;
  chunkSize: number;
  indexPattern?: IIndexPattern;
}) => {
  const exceptionQueries = buildExceptionListQueries({ language: 'kuery', lists });
  if (exceptionQueries.length === 0) {
    return undefined;
  }
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
