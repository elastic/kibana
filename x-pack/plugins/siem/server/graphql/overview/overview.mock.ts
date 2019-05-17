/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../../utils/logger';
import { SiemContext } from '../index';
import { OverviewHostData, OverviewNetworkData } from '../types';

export const mockOverviewNetworkData: { OverviewNetwork: OverviewNetworkData } = {
  OverviewNetwork: {
    packetbeatFlow: 0,
    packetbeatDNS: 0,
    filebeatSuricata: 0,
    filebeatZeek: 0,
    auditbeatSocket: 0,
  },
};

export const getOverviewNetworkQueryMock = (logger: Logger) => ({
  source: (root: unknown, args: unknown, context: SiemContext) => {
    logger.info('Mock source');
    const operationName = context.req.payload.operationName.toLowerCase();
    switch (operationName) {
      case 'test': {
        logger.info(`Using mock for test ${mockOverviewNetworkData}`);
        return mockOverviewNetworkData;
      }
      default: {
        return {};
      }
    }
  },
});

export const mockOverviewHostData: { OverviewHost: OverviewHostData } = {
  OverviewHost: {
    auditbeatAuditd: 0,
    auditbeatFIM: 0,
    auditbeatLogin: 0,
    auditbeatPackage: 0,
    auditbeatProcess: 0,
    auditbeatUser: 0,
  },
};

export const getOverviewHostQueryMock = (logger: Logger) => ({
  source: (root: unknown, args: unknown, context: SiemContext) => {
    logger.info('Mock source');
    const operationName = context.req.payload.operationName.toLowerCase();
    switch (operationName) {
      case 'test': {
        logger.info(`Using mock for test ${mockOverviewHostData}`);
        return mockOverviewHostData;
      }
      default: {
        return {};
      }
    }
  },
});
