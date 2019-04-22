/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../../utils/logger';
import { SiemContext } from '../index';

export const mockSourceData = {
  id: 'default',
  configuration: {
    fields: {
      host: 'beat.hostname',
    },
  },
  status: {
    auditbeatIndicesExist: true,
    auditbeatAliasExists: true,
    auditbeatIndices: ['auditbeat-7.0.0-alpha1-2018.10.03', 'auditbeat-7.0.0-alpha1-2018.10.04'],
    winlogbeatAliasExists: true,
    winlogbeatIndicesExist: true,
    winlogbeatIndices: ['winlogbeat-7.0.0-alpha1-2018.10.03', 'winlogbeat-7.0.0-alpha1-2018.10.04'],
    indexFields: [
      {
        name: '@timestamp',
        searchable: true,
        type: 'date',
        aggregatable: true,
      },
      {
        name: 'apache2.access.agent',
        searchable: true,
        type: 'string',
        aggregatable: false,
      },
    ],
  },
};

export const getSourceQueryMock = (logger: Logger) => ({
  source: (root: unknown, args: unknown, context: SiemContext) => {
    logger.info('Mock source');
    const operationName = context.req.payload.operationName.toLowerCase();
    switch (operationName) {
      case 'test': {
        logger.info(`Using mock for test ${mockSourceData}`);
        return mockSourceData;
      }
      default: {
        return {};
      }
    }
  },
});
