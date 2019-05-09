/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { GraphQLResolveInfo } from 'graphql';

import { Source } from '../../graphql/types';
import { FrameworkRequest, internalFrameworkRequest } from '../../lib/framework';
import { KpiNetwork } from '../../lib/kpi_network';
import { KpiNetworkAdapter } from '../../lib/kpi_network/types';
import { SourceStatus } from '../../lib/source_status';
import { Sources } from '../../lib/sources';
import { createSourcesResolvers } from '../sources';
import { SourcesResolversDeps } from '../sources/resolvers';
import { mockSourcesAdapter, mockSourceStatusAdapter } from '../sources/resolvers.test';

import { mockKpiNetworkData, mockKpiNetworkFields } from './kpi_network.mock';
import { createKpiNetworkResolvers, KpiNetworkResolversDeps } from './resolvers';

const mockGetFields = jest.fn();
mockGetFields.mockResolvedValue({ fieldNodes: [mockKpiNetworkFields] });
jest.doMock('../../utils/build_query/fields', () => ({
  getFields: mockGetFields,
}));

const mockGetKpiNetwork = jest.fn();
mockGetKpiNetwork.mockResolvedValue({
  KpiNetwork: {
    ...mockKpiNetworkData.KpiNetwork,
  },
});
const mockKpiNetworkAdapter: KpiNetworkAdapter = {
  getKpiNetwork: mockGetKpiNetwork,
};

const mockKpiNetworkLibs: KpiNetworkResolversDeps = {
  kpiNetwork: new KpiNetwork(mockKpiNetworkAdapter),
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
  test('Make sure that getKpiNetwork have been called', async () => {
    const source = await createSourcesResolvers(mockSrcLibs).Query.source(
      {},
      { id: 'default' },
      context,
      {} as GraphQLResolveInfo
    );
    const data = await createKpiNetworkResolvers(mockKpiNetworkLibs).Source.KpiNetwork(
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
    expect(mockKpiNetworkAdapter.getKpiNetwork).toHaveBeenCalled();
    expect(data).toEqual(mockKpiNetworkData);
  });
});
