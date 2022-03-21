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
import { Filter, EsQueryConfig, DataViewBase, buildEsQuery } from '@kbn/es-query';
import {
  EqlSearchRequest,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

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
  const indexPattern: DataViewBase = {
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

  const defaultTimeFields = ['@timestamp'];
  const timestamps =
    timestampOverride != null ? [timestampOverride, ...defaultTimeFields] : defaultTimeFields;
  const docFields = timestamps.map((tstamp) => ({
    field: tstamp,
    format: 'strict_date_optional_time',
  }));

  // Assume that `indices.query.bool.max_clause_count` is at least 1024 (the default value),
  // allowing us to make 1024-item chunks of exception list items.
  // Discussion at https://issues.apache.org/jira/browse/LUCENE-4835 indicates that 1024 is a
  // very conservative value.
  const exceptionFilter = buildExceptionFilter({
    lists: exceptionLists,
    excludeExceptions: true,
    chunkSize: 1024,
  });
  const requestFilter: QueryDslQueryContainer[] = [
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
          bool: exceptionFilter.query?.bool,
        },
      },
    });
  }
  const fields = [
    {
      field: '*',
      include_unmapped: true,
    },
    ...docFields,
  ];
  return {
    index,
    allow_no_indices: true,
    body: {
      size,
      query,
      filter: {
        bool: {
          filter: requestFilter,
        },
      },
      event_category_field: eventCategoryOverride,
      fields,
    },
  };
};
