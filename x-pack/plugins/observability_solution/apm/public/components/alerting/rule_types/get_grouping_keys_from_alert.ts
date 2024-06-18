/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { TopAlert } from '@kbn/observability-plugin/public';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { buildEsQuery } from '@kbn/es-query';
import {
  ERROR_GROUP_ID,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/es_fields/apm';
import { termQuery } from '../../../../common/utils/term_query';
import { ErrorCountRuleParams } from './error_count_rule_type';
import { TransactionDurationRuleParams } from './transaction_duration_rule_type';
import { ErrorRateRuleParams } from './transaction_error_rate_rule_type';

export function getGroupingKeysFromAlert<
  TRuleParams extends ErrorCountRuleParams | TransactionDurationRuleParams | ErrorRateRuleParams
>({ alert, rule }: { alert: TopAlert<Record<string, any>>; rule: Rule<TRuleParams> }) {
  const params = rule.params;

  const groupingFields: string[] = [];

  if (params.serviceName || params.groupBy?.includes(SERVICE_NAME)) {
    groupingFields.push(SERVICE_NAME);
  }

  if (params.environment || params.groupBy?.includes(SERVICE_ENVIRONMENT)) {
    groupingFields.push(SERVICE_ENVIRONMENT);
  }

  if (params.transactionName || params.groupBy?.includes(TRANSACTION_NAME)) {
    groupingFields.push(TRANSACTION_NAME);
  }

  if (params.errorGroupingKey || params.groupBy?.includes(ERROR_GROUP_ID)) {
    groupingFields.push(ERROR_GROUP_ID);
  }

  if (params.transactionType || params.groupBy?.includes(TRANSACTION_TYPE)) {
    groupingFields.push(TRANSACTION_TYPE);
  }

  const keys: Record<string, string> = {};

  const filters: QueryDslQueryContainer[] = [];

  groupingFields.forEach((field) => {
    const value = alert.fields[field];
    if (value) {
      keys[field] = alert.fields[field];
      filters.push(...termQuery(field, value));
    }
  });

  if (params.searchConfiguration?.query.query) {
    const esQuery = buildEsQuery(undefined, params.searchConfiguration.query, []);
    filters.push(esQuery);
  }

  return {
    keys,
    filters,
  };
}
