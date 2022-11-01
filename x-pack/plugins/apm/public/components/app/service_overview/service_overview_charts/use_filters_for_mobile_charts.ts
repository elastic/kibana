/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { type QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { isNil, isEmpty } from 'lodash';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import { useApmParams } from '../../../../hooks/use_apm_params';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
  PROCESSOR_EVENT,
  HOST_OS_VERSION,
  DEVICE_MODEL_IDENTIFIER,
  NETWORK_CONNECTION_TYPE,
  SERVICE_VERSION,
} from '../../../../../common/elasticsearch_fieldnames';

function termQuery<T extends string>(
  field: T,
  value: string | boolean | number | undefined | null
): QueryDslQueryContainer[] {
  if (isNil(value) || isEmpty(value)) {
    return [];
  }

  return [{ term: { [field]: value } }];
}

export function useFiltersForMobileCharts() {
  const {
    path: { serviceName },
    query: {
      environment,
      transactionType,
      device,
      osVersion,
      appVersion,
      netConnectionType,
    },
  } = useApmParams('/services/{serviceName}/overview');

  return useMemo(
    () =>
      [
        ...termQuery(PROCESSOR_EVENT, ProcessorEvent.transaction),
        ...termQuery(SERVICE_NAME, serviceName),
        ...termQuery(TRANSACTION_TYPE, transactionType),
        ...termQuery(HOST_OS_VERSION, osVersion),
        ...termQuery(DEVICE_MODEL_IDENTIFIER, device),
        ...termQuery(NETWORK_CONNECTION_TYPE, netConnectionType),
        ...termQuery(SERVICE_VERSION, appVersion),
        ...environmentQuery(environment),
      ].map((query) => ({
        meta: {},
        query,
      })),
    [
      environment,
      transactionType,
      serviceName,
      osVersion,
      device,
      netConnectionType,
      appVersion,
    ]
  );
}
