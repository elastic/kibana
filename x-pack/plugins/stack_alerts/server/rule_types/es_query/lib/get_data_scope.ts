/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray } from 'lodash';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { Filter, Query, buildEsQuery } from '@kbn/es-query';
import type { EsQueryRuleParams } from '../rule_type_params';
import { OnlyEsQueryRuleParams, OnlySearchSourceRuleParams } from '../types';
import { getParsedQuery, isEsQueryRule, isSearchSourceRule } from '../util';

export function getDataScope(
  params: EsQueryRuleParams
): { query: QueryDslQueryContainer; index: string[]; groupingFields?: string[] } | undefined {
  if (isEsQueryRule(params.searchType)) {
    const esQueryRuleParams = params as OnlyEsQueryRuleParams;
    const { query } = getParsedQuery(esQueryRuleParams);

    return {
      index: params.index,
      query,
      groupingFields: params.termField ? castArray(params.termField) : [],
    };
  } else if (isSearchSourceRule(params.searchType)) {
    const searchSourceRuleParams = params as OnlySearchSourceRuleParams;
    const searchConfig = searchSourceRuleParams.searchConfiguration as {
      index: string | string[];
      filter?: Filter;
      query?: Query;
    };

    return {
      index: castArray(searchConfig.index),
      query: buildEsQuery(undefined, searchConfig.query ?? [], searchConfig.filter ?? []),
      groupingFields: params.termField ? castArray(params.termField) : [],
    };
  }

  return undefined;
}
