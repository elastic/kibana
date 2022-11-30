/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Language } from '@kbn/securitysolution-io-ts-alerting-types';
import type { Filter, EsQueryConfig, DataViewBase } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import type { ESBoolQuery } from '../../../../common/typed_json';
import type { IndexPatternArray, RuleQuery } from '../../../../common/detection_engine/rule_schema';

export const getQueryFilter = ({
  query,
  language,
  filters,
  index,
  exceptionFilter,
}: {
  query: RuleQuery;
  language: Language;
  filters: unknown;
  index: IndexPatternArray;
  exceptionFilter: Filter | undefined;
}): ESBoolQuery => {
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
