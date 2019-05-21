/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { GraphQLResolveInfo } from 'graphql';
import { clone } from 'lodash/fp';

import {
  Direction,
  FlowDirection,
  FlowTarget,
  NetworkDnsFields,
  NetworkTopNFlowFields,
  Source,
} from '../../graphql/types';
import { FrameworkRequest, internalFrameworkRequest } from '../../lib/framework';
import { Network, NetworkAdapter } from '../../lib/network';
import { SourceStatus } from '../../lib/source_status';
import { Sources } from '../../lib/sources';
import { createSourcesResolvers } from '../sources';
import { SourcesResolversDeps } from '../sources/resolvers';
import { mockSourcesAdapter, mockSourceStatusAdapter } from '../sources/resolvers.test';

import {
  mockNetworkDnsData,
  mockNetworkDnsFields,
  mockNetworkTopNFlowData,
  mockNetworkTopNFlowFields,
} from './network.mock';
import { createNetworkResolvers, NetworkResolversDeps } from './resolvers';

const mockGetNetworkTopNFlow = jest.fn();
mockGetNetworkTopNFlow.mockResolvedValue({
  NetworkTopNFlow: {
    ...mockNetworkTopNFlowData.NetworkTopNFlow,
  },
});
const mockGetNetworkDns = jest.fn();
mockGetNetworkDns.mockResolvedValue({
  NetworkDns: {
    ...mockNetworkDnsData.NetworkDns,
  },
});
const mockNetworkAdapter: NetworkAdapter = {
  getNetworkTopNFlow: mockGetNetworkTopNFlow,
  getNetworkDns: mockGetNetworkDns,
};

const mockNetworkLibs: NetworkResolversDeps = {
  network: new Network(mockNetworkAdapter),
};

const mockSrcLibs: SourcesResolversDeps = {
  sources: new Sources(mockSourcesAdapter),
  sourceStatus: new SourceStatus(mockSourceStatusAdapter, new Sources(mockSourcesAdapter)),
};

const req: FrameworkRequest = {
  [internalFrameworkRequest]: {
    params: {},
    query: {},
    payload: {
      operationName: 'test',
    },
  },
  params: {},
  query: {},
  payload: {
    operationName: 'test',
  },
};

describe('Test Source Resolvers', () => {
  test('Make sure that getNetworkTopNFlow have been called', async () => {
    const context = clone({ req });
    context.req.payload.operationName = 'top-n-flow';

    const mockGetFields = jest.fn();
    mockGetFields.mockResolvedValue({ fieldNodes: [mockNetworkTopNFlowFields] });
    jest.doMock('../../utils/build_query/fields', () => ({
      getFields: mockGetFields,
    }));

    const source = await createSourcesResolvers(mockSrcLibs).Query.source(
      {},
      { id: 'default' },
      context,
      {} as GraphQLResolveInfo
    );
    const data = await createNetworkResolvers(mockNetworkLibs).Source.NetworkTopNFlow(
      source as Source,
      {
        timerange: {
          interval: '12h',
          to: 1514782800000,
          from: 1546318799999,
        },
        pagination: {
          limit: 2,
          cursor: null,
        },
        sort: { field: NetworkTopNFlowFields.bytes, direction: Direction.desc },
        flowTarget: FlowTarget.source,
        flowDirection: FlowDirection.uniDirectional,
      },
      context,
      {} as GraphQLResolveInfo
    );

    expect(mockNetworkAdapter.getNetworkTopNFlow).toHaveBeenCalled();
    expect(data).toEqual(mockNetworkTopNFlowData);
  });

  test('Make sure that getNetworkDns have been called', async () => {
    const context = clone({ req });
    context.req.payload.operationName = 'dns';

    const mockGetFields = jest.fn();
    mockGetFields.mockResolvedValue({ fieldNodes: [mockNetworkDnsFields] });
    jest.doMock('../../utils/build_query/fields', () => ({
      getFields: mockGetFields,
    }));

    const source = await createSourcesResolvers(mockSrcLibs).Query.source(
      {},
      { id: 'default' },
      context,
      {} as GraphQLResolveInfo
    );
    const data = await createNetworkResolvers(mockNetworkLibs).Source.NetworkDns(
      source as Source,
      {
        timerange: {
          interval: '12h',
          to: 1514782800000,
          from: 1546318799999,
        },
        pagination: {
          limit: 2,
          cursor: null,
        },
        isPtrIncluded: false,
        sort: { field: NetworkDnsFields.uniqueDomains, direction: Direction.asc },
      },
      context,
      {} as GraphQLResolveInfo
    );

    expect(mockNetworkAdapter.getNetworkDns).toHaveBeenCalled();
    expect(data).toEqual(mockNetworkDnsData);
  });
});
