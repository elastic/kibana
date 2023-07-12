/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsQueryConfig, Query } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';

export const getQueryFilter = ({ filter }: { filter: string }) => {
  // export const getQueryFilter = ({ filter }: GetQueryFilterOptions): GetQueryFilterReturn => {
  const kqlQuery: Query = {
    language: 'kuery',
    query: filter,
  };
  const config: EsQueryConfig = {
    allowLeadingWildcards: true,
    dateFormatTZ: 'Zulu',
    ignoreFilterIfFieldNotInIndex: false,
    queryStringOptions: { analyze_wildcard: true },
  };

  return buildEsQuery(undefined, kqlQuery, [], config);
};
