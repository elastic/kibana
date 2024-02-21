/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Environment } from '../../../../common/environment_rt';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/es_fields/apm';
import { string } from '../../../../common/utils/esql';
import { getEsqlDateRangeFilter } from '../../../../common/utils/esql/get_esql_date_range_filter';
import { getEsqlEnvironmentFilter } from '../../../../common/utils/esql/get_esql_environment_filter';

export function getThroughputScreenContext({
  serviceName,
  transactionName,
  transactionType,
  environment,
  start,
  end,
  preferred,
}: {
  serviceName?: string;
  transactionName?: string;
  transactionType?: string;
  environment?: Environment;
  start: string;
  end: string;
  preferred: {
    bucketSizeInSeconds: number;
  } | null;
}) {
  const clauses = [
    `${PROCESSOR_EVENT} == "transaction"`,
    getEsqlDateRangeFilter(start, end),
    serviceName ? `${SERVICE_NAME} == ${string`${serviceName}`}` : '',
    transactionName
      ? `${TRANSACTION_NAME} == ${string`${transactionName}`}`
      : '',
    transactionType
      ? `${TRANSACTION_TYPE} == ${string`${transactionType}`}`
      : '',
    environment ? getEsqlEnvironmentFilter(environment) : '',
  ].filter(Boolean);

  return {
    screenDescription: `There is a throughput chart displayed. The ES|QL equivalent for this is:
    
      \`\`\`esql
      FROM traces-apm*
        | WHERE ${clauses.join(' AND ')}
        ${
          preferred
            ? `| EVAL date_bucket = DATE_TRUNC(${preferred?.bucketSizeInSeconds} seconds, @timestamp)`
            : ''
        }
        | STATS count = COUNT(*)${preferred ? ` BY date_bucket` : ''}
      \`\`\`
    `,
  };
}
