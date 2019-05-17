/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FieldNode } from 'graphql';

import { Logger } from '../../utils/logger';
import { SiemContext } from '../index';
import { KpiNetworkData } from '../types';

export const mockKpiNetworkData: { KpiNetwork: KpiNetworkData } = {
  KpiNetwork: {
    networkEvents: 0,
    uniqueFlowId: 0,
    activeAgents: 0,
    uniqueSourcePrivateIps: 0,
    uniqueDestinationPrivateIps: 0,
  },
};

export const getKpiNetworkQueryMock = (logger: Logger) => ({
  source: (root: unknown, args: unknown, context: SiemContext) => {
    logger.info('Mock source');
    const operationName = context.req.payload.operationName.toLowerCase();
    switch (operationName) {
      case 'test': {
        logger.info(`Using mock for test ${mockKpiNetworkData}`);
        return mockKpiNetworkData;
      }
      default: {
        return {};
      }
    }
  },
});

export const mockKpiNetworkFields: FieldNode = {
  kind: 'Field',
  name: {
    kind: 'Name',
    value: 'KpiNetwork',
  },
  selectionSet: {
    kind: 'SelectionSet',
    selections: [
      {
        kind: 'Field',
        name: {
          kind: 'Name',
          value: 'networkEvents',
        },
        arguments: [],
        directives: [],
      },
      {
        kind: 'Field',
        name: {
          kind: 'Name',
          value: 'uniqueFlowId',
        },
        arguments: [],
        directives: [],
      },
      {
        kind: 'Field',
        name: {
          kind: 'Name',
          value: 'activeAgents',
        },
        arguments: [],
        directives: [],
      },
    ],
  },
};
