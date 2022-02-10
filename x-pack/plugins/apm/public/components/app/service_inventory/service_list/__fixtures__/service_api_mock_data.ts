/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APIReturnType } from '../../../../../services/rest/create_call_apm_api';

type ServiceListAPIResponse = APIReturnType<'GET /internal/apm/services'>;

export const items: ServiceListAPIResponse['items'] = [
  {
    serviceName: 'opbeans-node',
    transactionType: 'request',
    agentName: 'nodejs',
    throughput: 0,
    transactionErrorRate: 46.06666666666667,
    latency: null,
    environments: ['test'],
  },
  {
    serviceName: 'opbeans-python',
    transactionType: 'page-load',
    agentName: 'python',
    throughput: 86.93333333333334,
    transactionErrorRate: 12.6,
    latency: 91535.42944785276,
    environments: [],
  },
];
