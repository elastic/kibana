/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../../utils/logger';
import { SiemContext } from '../index';
import { KpiHostsData } from '../types';

export const mockKpiHostsData: { KpiHosts: KpiHostsData } = {
  KpiHosts: {
    hosts: 0,
    agents: 0,
    authentication: {
      success: 0,
      failure: 0,
    },
    uniqueSourceIps: 0,
    uniqueDestinationIps: 0,
  },
};

export const getKpiHostsQueryMock = (logger: Logger) => ({
  source: (root: unknown, args: unknown, context: SiemContext) => {
    logger.info('Mock source');
    const operationName = context.req.payload.operationName.toLowerCase();
    switch (operationName) {
      case 'test': {
        logger.info(`Using mock for test ${mockKpiHostsData}`);
        return mockKpiHostsData;
      }
      default: {
        return {};
      }
    }
  },
});
