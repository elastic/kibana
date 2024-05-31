/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import type { Environment } from '../../../../../common/environment_rt';
import {
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../../common/es_fields/apm';

export function getLatencyChartScreenContext({
  serviceName,
  transactionName,
  transactionType,
  environment,
  bucketSizeInSeconds,
}: {
  serviceName?: string;
  transactionName?: string;
  transactionType?: string;
  environment?: Environment;
  bucketSizeInSeconds?: number;
}) {
  const fieldValues = {
    [PROCESSOR_EVENT]: 'transaction',
    ...(serviceName ? { [SERVICE_NAME]: serviceName } : {}),
    ...(transactionName ? { [TRANSACTION_NAME]: transactionName } : {}),
    ...(transactionType ? { [TRANSACTION_TYPE]: transactionType } : {}),
    ...(environment && environment !== ENVIRONMENT_ALL.value
      ? { [SERVICE_ENVIRONMENT]: environment }
      : {}),
  };

  return {
    screenDescription: `There is a latency chart displayed. The field values are: ${JSON.stringify(
      fieldValues
    )}. ${
      bucketSizeInSeconds !== undefined
        ? `The bucket size in seconds is ${bucketSizeInSeconds}s`
        : ''
    }
  `,
  };
}
