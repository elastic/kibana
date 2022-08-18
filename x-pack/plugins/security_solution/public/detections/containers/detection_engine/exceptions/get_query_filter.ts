/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Language } from '@kbn/securitysolution-io-ts-alerting-types';
import type {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import type { Filter, EsQueryConfig, DataViewBase } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';

import type { Query, Index } from '../../../../../common/detection_engine/schemas/common';
import type { ESBoolQuery } from '../../../../../common/typed_json';
import { getExceptionFilterFromExceptions } from './api';

export const getQueryFilter = async (
  query: Query,
  language: Language,
  filters: unknown,
  index: Index,
  lists: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>,
  excludeExceptions: boolean = true
): Promise<ESBoolQuery> => {
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
  const { filter } = await getExceptionFilterFromExceptions({
    exceptions: lists,
    excludeExceptions,
    chunkSize: 1024,
  });
  const initialQuery = { query, language };
  const allFilters = getAllFilters(filters as Filter[], filter);

  return buildEsQuery(indexPattern, initialQuery, allFilters, config);
};

export const getAllFilters = (filters: Filter[], exceptionFilter: Filter | undefined): Filter[] => {
  if (exceptionFilter != null) {
    return [...filters, exceptionFilter];
  } else {
    return [...filters];
  }
};
