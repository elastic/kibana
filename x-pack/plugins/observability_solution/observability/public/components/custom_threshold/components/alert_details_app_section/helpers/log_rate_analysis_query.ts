/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ALERT_RULE_PARAMETERS } from '@kbn/rule-data-utils';
import { CustomThresholdAlert } from '../../types';
import { getGroupFilters } from '../../../../../../common/custom_threshold_rule/helpers/get_group';
import { Aggregators } from '../../../../../../common/custom_threshold_rule/types';
import { buildEsQuery } from '../../../../../utils/build_es_query';
import type { CustomThresholdExpressionMetric } from '../../../../../../common/custom_threshold_rule/types';
import { Group } from '../../../../../../common/typings';

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
  alert: CustomThresholdAlert
): QueryDslQueryContainer | undefined => {
  const ruleParams = alert.fields[ALERT_RULE_PARAMETERS];
  // We only show log rate analysis for one condition with one count aggregation
  if (
    ruleParams.criteria.length !== 1 ||
    ruleParams.criteria[0].metrics.length !== 1 ||
    ruleParams.criteria[0].metrics[0].aggType !== Aggregators.COUNT
  ) {
    return;
  }

  const group = get(alert, 'fields["kibana.alert.group"]') as Group[] | undefined;
  const optionalFilter = get(ruleParams.searchConfiguration, 'query.query') as string | undefined;
  const groupByFilters = getGroupFilters(group);
  const boolQuery = buildEsQuery({
    kuery: getKuery(ruleParams.criteria[0].metrics, optionalFilter),
    filters: groupByFilters,
  });

  return boolQuery;
};
