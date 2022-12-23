/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  HOST_OS_VERSION,
  DEVICE_MODEL_NAME,
  NETWORK_CONNECTION_TYPE,
  SERVICE_VERSION,
} from '../../common/es_fields/apm';
import { paramQuery } from '../../common/utils/param_query';
import { useAnyOfApmParams } from './use_apm_params';

export function useKueryWithFilters() {
  const {
    query: { device, osVersion, appVersion, netConnectionType, kuery },
  } = useAnyOfApmParams(
    '/mobile-services/{serviceName}/overview',
    '/mobile-services/{serviceName}/transactions'
  );

  return useMemo(
    () =>
      [
        kuery,
        ...paramQuery(DEVICE_MODEL_NAME, device),
        ...paramQuery(HOST_OS_VERSION, osVersion),
        ...paramQuery(SERVICE_VERSION, appVersion),
        ...paramQuery(NETWORK_CONNECTION_TYPE, netConnectionType),
      ]
        .filter(Boolean)
        .join(' and '),
    [device, osVersion, appVersion, netConnectionType, kuery]
  );
}
