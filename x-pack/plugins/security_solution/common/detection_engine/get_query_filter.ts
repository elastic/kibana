/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Language } from '@kbn/securitysolution-io-ts-alerting-types';
import type {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { buildExceptionFilter } from '@kbn/securitysolution-list-utils';
import {
  Filter,
  IIndexPattern,
  buildEsQuery,
  EsQueryConfig,
} from '../../../../../src/plugins/data/common';
import { ESBoolQuery } from '../typed_json';
import { Query, Index, TimestampOverrideOrUndefined } from './schemas/common/schemas';

export const getQueryFilter = (
  query: Query,
  language: Language,
  filters: unknown,
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
  // Assume that `indices.query.bool.max_clause_count` is at least 1024 (the default value),
  // allowing us to make 1024-item chunks of exception list items.
  // Discussion at https://issues.apache.org/jira/browse/LUCENE-4835 indicates that 1024 is a
  // very conservative value.
  const exceptionFilter = buildExceptionFilter({
    lists,
    excludeExceptions,
    chunkSize: 1024,
  });
  const initialQuery = { query, language };
  const allFilters = getAllFilters(filters as Filter[], exceptionFilter);

  return buildEsQuery(indexPattern, initialQuery, allFilters, config);
};

export const getAllFilters = (filters: Filter[], exceptionFilter: Filter | undefined): Filter[] => {
  if (exceptionFilter != null) {
    return [...filters, exceptionFilter];
  } else {
    return [...filters];
  }
};

interface EqlSearchRequest {
  method: string;
  path: string;
  body: object;
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
  // Assume that `indices.query.bool.max_clause_count` is at least 1024 (the default value),
  // allowing us to make 1024-item chunks of exception list items.
  // Discussion at https://issues.apache.org/jira/browse/LUCENE-4835 indicates that 1024 is a
  // very conservative value.
  const exceptionFilter = buildExceptionFilter({
    lists: exceptionLists,
    excludeExceptions: true,
    chunkSize: 1024,
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
  return {
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
      event_category_field: eventCategoryOverride,
      fields: [
        {
          field: '*',
          include_unmapped: true,
        },
        {
          field: '@timestamp',
          // BUG: We have to format @timestamp until this bug is fixed with epoch_millis
          // https://github.com/elastic/elasticsearch/issues/74582
          // TODO: Remove epoch and use the same techniques from x-pack/plugins/security_solution/server/lib/detection_engine/signals/build_events_query.ts
          // where we format both the timestamp and any overrides as ISO8601
          format: 'epoch_millis',
        },
      ],
    },
  };
};
