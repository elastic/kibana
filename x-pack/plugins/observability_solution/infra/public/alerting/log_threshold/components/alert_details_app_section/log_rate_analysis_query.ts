/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TopAlert } from '@kbn/observability-plugin/public';
import { ALERT_CONTEXT } from '@kbn/rule-data-utils';
import { get } from 'lodash';
import { RuleParams, CountCriteria } from '../../../../../common/alerting/logs/log_threshold';
import { buildFiltersFromCriteria } from '../../../../../common/alerting/logs/log_threshold/query_helpers';

export const getESQueryForLogRateAnalysis = (
  params: Pick<RuleParams, 'timeSize' | 'timeUnit'> & { criteria: CountCriteria },
  timestampField: string,
  alert: TopAlert<Record<string, any>>,
  groupBy?: string[] | undefined
): object => {
  const { mustFilters, mustNotFilters, mustFiltersFields } = buildFiltersFromCriteria(
    params,
    timestampField
  );

  const groupByFilters = groupBy
    ? groupBy
        .filter((groupByField) => !mustFiltersFields.includes(groupByField))
        .map((groupByField) => {
          const groupByValue = get(
            alert.fields[ALERT_CONTEXT],
            ['groupByKeys', ...groupByField.split('.')],
            null
          );
          return groupByValue ? { term: { [groupByField]: { value: groupByValue } } } : null;
        })
        .filter((groupByFilter) => groupByFilter)
    : [];

  const query = {
    bool: {
      filter: [...mustFilters, ...groupByFilters],
      ...(mustNotFilters.length > 0 && { must_not: mustNotFilters }),
    },
  };
  return query;
};
