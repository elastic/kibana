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
        count: {
          doc_count: 91.01353874452269,
          value: 84.36392955408016,
        },
        key: 1556089200000,
      },
      {
        count: {
          doc_count: -71.23554555913962,
          value: -86.81571698230019,
        },
        key: 1556132400000,
      },
      {
        count: {
          doc_count: -46.879996993392936,
          value: 20.02705123314729,
        },
        key: 1556175600000,
      },
    ],
    authSuccess: 2,
    authSuccessHistogram: [
      {
        count: {
          doc_count: -65.55778706419551,
          value: 67.95125899290869,
        },
        key: 1556128800000,
      },
      {
        count: {
          doc_count: 92.17135402067896,
          value: -16.86811977391112,
        },
        key: 1556139600000,
      },
      {
        count: {
          doc_count: -94.72718497628212,
          value: 89.51615311876893,
        },
        key: 1556150400000,
      },
      {
        count: {
          doc_count: 32.72219362130082,
          value: 1.473185911562652,
        },
        key: 1556161200000,
      },
    ],
    authFailure: 306495,
    authFailureHistogram: [
      {
        count: {
          doc_count: 22.67887099679365,
          value: 71.72317515961674,
        },
        key: 54.78386776414678,
      },
      {
        count: {
          doc_count: 19.546134098311626,
          value: 24.07834605598333,
        },
        key: -88.10762445863057,
      },
      {
        count: {
          doc_count: -93.9609610318457,
          value: 86.81313898837192,
        },
        key: 1556175600000,
      },
    ],
    uniqueSourceIps: 11929,
    uniqueSourceIpsHistogram: [
      {
        count: {
          doc_count: -93.65873039980133,
          value: 35.87162669927895,
        },
        key: 1556089200000,
      },
      {
        count: {
          doc_count: -1.0873234537593532,
          value: -10.889541449439605,
        },
        key: 1556132400000,
      },
      {
        count: {
          doc_count: -29.624594846902227,
          value: -7.672285811211083,
        },
        key: 1556175600000,
      },
    ],
    uniqueDestinationIps: 2662,
    uniqueDestinationIpsHistogram: [
      {
        count: {
          doc_count: 53.48312028233991,
          value: 53.28368150914008,
        },
        key: 1556089200000,
      },
      {
        count: {
          doc_count: -18.265149209717222,
          value: 98.66572548343012,
        },
        key: 1556132400000,
      },
      {
        count: {
          doc_count: 12.442923157321715,
          value: 57.449121360985515,
        },
        key: 1556175600000,
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
