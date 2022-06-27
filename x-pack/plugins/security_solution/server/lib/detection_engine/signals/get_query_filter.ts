/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Language } from '@kbn/securitysolution-io-ts-alerting-types';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { Filter, EsQueryConfig, DataViewBase, buildEsQuery } from '@kbn/es-query';
import { ListClient } from '@kbn/lists-plugin/server';
import { ESBoolQuery } from '../../../../common/typed_json';
import { Index, Query } from '../../../../common/detection_engine/schemas/common';
import { buildExceptionFilter } from '../exceptions/build_exception_filter';

export const getQueryFilter = async ({
  query,
  language,
  filters,
  index,
  lists,
  listClient,
  excludeExceptions = true,
}: {
  query: Query;
  language: Language;
  filters: unknown;
  index: Index;
  lists: ExceptionListItemSchema[];
  listClient: ListClient;
  excludeExceptions?: boolean;
}): Promise<{
  queryFilter: ESBoolQuery;
  unprocessedExceptions: ExceptionListItemSchema[];
}> => {
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
  const { filter: exceptionFilter, unprocessedExceptions } = await buildExceptionFilter({
    lists,
    excludeExceptions,
    chunkSize: 1024,
    alias: null,
    listClient,
  });
  const initialQuery = { query, language };
  const allFilters = getAllFilters(filters as Filter[], exceptionFilter);

  return {
    queryFilter: buildEsQuery(indexPattern, initialQuery, allFilters, config),
    unprocessedExceptions,
  };
};

export const getAllFilters = (filters: Filter[], exceptionFilter: Filter | undefined): Filter[] => {
  if (exceptionFilter != null) {
    return [...filters, exceptionFilter];
  } else {
    return [...filters];
  }
};
