/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { GraphQLResolveInfo } from 'graphql';

import { Source } from '../../graphql/types';
import { FrameworkRequest, internalFrameworkRequest } from '../../lib/framework';
import { Overview } from '../../lib/overview';
import { OverviewAdapter } from '../../lib/overview/types';
import { SourceStatus } from '../../lib/source_status';
import { Sources } from '../../lib/sources';
import { createSourcesResolvers } from '../sources';
import { SourcesResolversDeps } from '../sources/resolvers';
import { mockSourcesAdapter, mockSourceStatusAdapter } from '../sources/resolvers.test';

import { mockOverviewHostData, mockOverviewNetworkData } from './overview.mock';
import { createOverviewResolvers, OverviewResolversDeps } from './resolvers';

const mockGetOverviewNetwork = jest.fn();
mockGetOverviewNetwork.mockResolvedValue({
  OverviewNetwork: {
    ...mockOverviewNetworkData.OverviewNetwork,
  },
});

const mockGetOverviewHost = jest.fn();
mockGetOverviewHost.mockResolvedValue({
  OverviewHost: {
    ...mockOverviewHostData.OverviewHost,
  },
});

const mockOverviewAdapter: OverviewAdapter = {
  getOverviewHost: mockGetOverviewHost,
  getOverviewNetwork: mockGetOverviewNetwork,
};

const mockOverviewLibs: OverviewResolversDeps = {
  overview: new Overview(mockOverviewAdapter),
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

describe('Test Overview SIEM Resolvers', () => {
  test('Make sure that getOverviewNetwork have been called', async () => {
    const source = await createSourcesResolvers(mockSrcLibs).Query.source(
      {},
      { id: 'default' },
      context,
      {} as GraphQLResolveInfo
    );
    const data = await createOverviewResolvers(mockOverviewLibs).Source.OverviewNetwork(
      source as Source,
      {
        timerange: {
          interval: '12h',
          to: 1514782800000,
          from: 1546318799999,
        },
      },
      context,
      {} as GraphQLResolveInfo
    );
    expect(mockOverviewAdapter.getOverviewNetwork).toHaveBeenCalled();
    expect(data).toEqual(mockOverviewNetworkData);
  });
  test('Make sure that getOverviewHost have been called', async () => {
    const source = await createSourcesResolvers(mockSrcLibs).Query.source(
      {},
      { id: 'default' },
      context,
      {} as GraphQLResolveInfo
    );
    const data = await createOverviewResolvers(mockOverviewLibs).Source.OverviewHost(
      source as Source,
      {
        timerange: {
          interval: '12h',
          to: 1514782800000,
          from: 1546318799999,
        },
      },
      context,
      {} as GraphQLResolveInfo
    );
    expect(mockOverviewAdapter.getOverviewHost).toHaveBeenCalled();
    expect(data).toEqual(mockOverviewHostData);
  });
});
