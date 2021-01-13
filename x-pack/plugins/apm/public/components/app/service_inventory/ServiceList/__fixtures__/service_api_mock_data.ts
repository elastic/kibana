/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { APIReturnType } from '../../../../../services/rest/createCallApmApi';

type ServiceListAPIResponse = APIReturnType<'GET /api/apm/services'>;

export const items: ServiceListAPIResponse['items'] = [
  {
    serviceName: 'opbeans-node',
    transactionType: 'request',
    agentName: 'nodejs',
    transactionsPerMinute: { value: 0, timeseries: [] },
    transactionErrorRate: { value: 46.06666666666667, timeseries: [] },
    avgResponseTime: { value: null, timeseries: [] },
    environments: ['test'],
  },
  {
    serviceName: 'opbeans-python',
    transactionType: 'page-load',
    agentName: 'python',
    transactionsPerMinute: { value: 86.93333333333334, timeseries: [] },
    transactionErrorRate: { value: 12.6, timeseries: [] },
    avgResponseTime: { value: 91535.42944785276, timeseries: [] },
    environments: [],
  },
];
