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
    hosts: 1026,
    hostsHistogram: [
      {
        "doc_count": 5017216,
        "key": 1556089200000,
      },
      {
        "doc_count": 4590090,
        "key": 1556132400000,
      },
      {
        "doc_count": 73901,
        "key": 1556175600000,
      },
    ],
    authSuccess: 2,
    authSuccessHistogram: [
      {
        "doc_count": 1,
        "key": 1556128800000,
      },
      {
        "doc_count": 0,
        "key": 1556139600000,
      },
      {
        "doc_count": 0,
        "key": 1556150400000,
      },
      {
        "doc_count": 1,
        "key": 1556161200000,
      },
    ],
    authFailure: 306495,
    authFailureHistogram: [
      {
        "doc_count": 220265,
        "key": 1556089200000,
      },
      {
        "doc_count": 86135,
        "key": 1556132400000,
      },
      {
        "doc_count": 95,
        "key": 1556175600000,
      },
    ],
    uniqueSourceIps: 11929,
    uniqueSourceIpsHistogram: [
      {
        "doc_count": 1419836,
        "key": 1556089200000,
      },
      {
        "doc_count": 1074440,
        "key": 1556132400000,
      },
      {
        "doc_count": 9328,
        "key": 1556175600000,
      },
    ],
    uniqueDestinationIps: 2662,
    uniqueDestinationIpsHistogram: [
      {
        "doc_count": 1189146,
        "key": 1556089200000,
      },
      {
        "doc_count": 977334,
        "key": 1556132400000,
      },
      {
        "doc_count": 8656,
        "key": 1556175600000,
      },
    ],
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
