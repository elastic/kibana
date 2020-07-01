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
  Query as DataQuery,
} from '../../../../../src/plugins/data/common';
import { ExceptionListItemSchema } from '../../../lists/common/schemas';
import { buildQueryExceptions } from './build_exceptions_query';
import { Query, Language, Index } from './schemas/common/schemas';

export const getQueryFilter = (
  query: Query,
  language: Language,
  filters: Array<Partial<Filter>>,
  index: Index,
  lists: ExceptionListItemSchema[]
) => {
  const indexPattern: IIndexPattern = {
    fields: [],
    title: index.join(),
  };

  const queries: DataQuery[] = buildQueryExceptions({ query, language, lists });

  const config = {
    allowLeadingWildcards: true,
    queryStringOptions: { analyze_wildcard: true },
    ignoreFilterIfFieldNotInIndex: false,
    dateFormatTZ: 'Zulu',
  };

  const enabledFilters = ((filters as unknown) as Filter[]).filter((f) => !isFilterDisabled(f));
  return buildEsQuery(indexPattern, queries, enabledFilters, config);
};
