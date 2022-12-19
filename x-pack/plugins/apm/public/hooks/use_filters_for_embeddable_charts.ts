/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
  HOST_OS_VERSION,
  DEVICE_MODEL_NAME,
  NETWORK_CONNECTION_TYPE,
  SERVICE_VERSION,
} from '../../common/es_fields/apm';
import { termQuery } from '../../common/utils/term_query';
import { useApmParams } from './use_apm_params';
import { environmentQuery } from '../../common/utils/environment_query';

export function useFiltersForEmbeddableCharts() {
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
  } = useApmParams('/mobile-services/{serviceName}/overview');

  return useMemo(
    () =>
      [
        ...termQuery(SERVICE_NAME, serviceName),
        ...termQuery(TRANSACTION_TYPE, transactionType),
        ...termQuery(HOST_OS_VERSION, osVersion),
        ...termQuery(DEVICE_MODEL_NAME, device),
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
