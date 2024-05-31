/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { getGroupFilters } from '../../../../../../common/custom_threshold_rule/helpers/get_group';
import { Aggregators } from '../../../../../../common/custom_threshold_rule/types';
import { buildEsQuery } from '../../../../../utils/build_es_query';
import type {
  CustomThresholdExpressionMetric,
  Group,
} from '../../../../../../common/custom_threshold_rule/types';
import type { TopAlert } from '../../../../../typings/alerts';
import type { CustomThresholdRuleTypeParams } from '../../../types';

const getKuery = (metrics: CustomThresholdExpressionMetric[], filter?: string) => {
  let query = '';
  const isOneCountConditionWithFilter =
    metrics.length === 1 && metrics[0].aggType === 'count' && metrics[0].filter;

  if (filter && isOneCountConditionWithFilter) {
    query = `(${filter}) and (${metrics[0].filter})`;
  } else if (isOneCountConditionWithFilter) {
    query = `(${metrics[0].filter!})`;
  } else if (filter) {
    query = `(${filter})`;
  }

  return query;
};

export const getLogRateAnalysisEQQuery = (
  alert: TopAlert<Record<string, any>>,
  params: CustomThresholdRuleTypeParams
): QueryDslQueryContainer | undefined => {
  // We only show log rate analysis for one condition with one count aggregation
  if (
    params.criteria.length !== 1 ||
    params.criteria[0].metrics.length !== 1 ||
    params.criteria[0].metrics[0].aggType !== Aggregators.COUNT
  ) {
    return;
  }

  const group: Group[] | undefined = get(alert, 'fields["kibana.alert.group"]');
  const optionalFilter: string | undefined = get(params.searchConfiguration, 'query.query');
  const groupByFilters = getGroupFilters(group);
  const boolQuery = buildEsQuery({
    kuery: getKuery(params.criteria[0].metrics, optionalFilter),
    filters: groupByFilters,
  });

  return boolQuery;
};
