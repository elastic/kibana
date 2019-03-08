/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { GraphQLResolveInfo } from 'graphql';

import { NetworkTopNFlowDirection, NetworkTopNFlowType, Source } from '../../graphql/types';
import { FrameworkRequest, internalFrameworkRequest } from '../../lib/framework';
import { Network, NetworkAdapter } from '../../lib/network';
import { SourceStatus } from '../../lib/source_status';
import { Sources } from '../../lib/sources';
import { createSourcesResolvers } from '../sources';
import { SourcesResolversDeps } from '../sources/resolvers';
import { mockSourcesAdapter, mockSourceStatusAdapter } from '../sources/resolvers.test';

import { mockNetworkTopNFlowData, mockNetworkTopNFlowFields } from './network.mock';
import { createNetworkResolvers, NetworkResolversDeps } from './resolvers';

const mockGetFields = jest.fn();
mockGetFields.mockResolvedValue({ fieldNodes: [mockNetworkTopNFlowFields] });
jest.mock('../../utils/build_query/fields', () => ({
  getFields: mockGetFields,
}));

const mockGetNetwork = jest.fn();
mockGetNetwork.mockResolvedValue({
  Network: {
    ...mockNetworkTopNFlowData.NetworkTopNFlow,
  },
});
const mockNetworkAdapter: NetworkAdapter = {
  getNetworkTopNFlow: mockGetNetwork,
  getNetworkDns: jest.fn(),
};

const mockNetworkTopNFlowLibs: NetworkResolversDeps = {
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

const context = { req };

describe('Test Source Resolvers', () => {
  test('Make sure that getNetworkTopNFlow have been called', async () => {
    const source = await createSourcesResolvers(mockSrcLibs).Query.source(
      {},
      { id: 'default' },
      context,
      {} as GraphQLResolveInfo
    );
    const data = await createNetworkResolvers(mockNetworkTopNFlowLibs).Source.NetworkTopNFlow(
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
        type: NetworkTopNFlowType.source,
        direction: NetworkTopNFlowDirection.uniDirectional,
      },
      context,
      {} as GraphQLResolveInfo
    );
    expect(mockNetworkAdapter.getNetworkTopNFlow).toHaveBeenCalled();
    expect(data).toEqual(mockNetworkTopNFlowData);
  });
});
