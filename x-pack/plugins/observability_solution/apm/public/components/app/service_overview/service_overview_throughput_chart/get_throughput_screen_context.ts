/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SERVICE_ENVIRONMENT } from '@kbn/observability-shared-plugin/common';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { Environment } from '../../../../../common/environment_rt';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../../common/es_fields/apm';

export function getThroughputScreenContext({
  serviceName,
  transactionName,
  transactionType,
  environment,
  preferred,
}: {
  serviceName?: string;
  transactionName?: string;
  transactionType?: string;
  environment?: Environment;
  preferred: {
    bucketSizeInSeconds: number;
  } | null;
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
    screenDescription: `There is a throughput chart displayed. The field values are: ${JSON.stringify(
      fieldValues
    )}. ${preferred ? `The bucket size in seconds is ${preferred?.bucketSizeInSeconds}s` : ''}`,
  };
}
