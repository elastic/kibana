/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const alertsFetchData = async () => {
  return Promise.resolve({
    data: [
      {
        id: '1',
        consumer: 'apm',
        name: 'Error rate | opbeans-java',
        alertTypeId: 'apm.error_rate',
        tags: ['apm', 'service.name:opbeans-java'],
        updatedAt: '2020-07-03T14:27:51.488Z',
        muteAll: true,
      },
      {
        id: '2',
        consumer: 'apm',
        name: 'Transaction duration | opbeans-java',
        alertTypeId: 'apm.transaction_duration',
        tags: ['apm', 'service.name:opbeans-java'],
        updatedAt: '2020-07-02T14:27:51.488Z',
        muteAll: true,
      },
      {
        id: '3',
        consumer: 'logs',
        name: 'Logs obs test',
        alertTypeId: 'logs.alert.document.count',
        tags: ['logs', 'observability'],
        updatedAt: '2020-06-30T14:27:51.488Z',
        muteAll: true,
      },
      {
        id: '4',
        consumer: 'metrics',
        name: 'Metrics obs test',
        alertTypeId: 'metrics.alert.inventory.threshold',
        tags: ['metrics', 'observability'],
        updatedAt: '2020-03-20T14:27:51.488Z',
        muteAll: true,
      },
      {
        id: '5',
        consumer: 'uptime',
        name: 'Uptime obs test',
        alertTypeId: 'xpack.uptime.alerts.monitorStatus',
        tags: ['uptime', 'observability'],
        updatedAt: '2020-03-25T17:27:51.488Z',
        muteAll: true,
      },
    ],
  });
};
