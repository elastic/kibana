/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { GraphQLResolveInfo } from 'graphql';

import { Source } from '../../graphql/types';
import { FrameworkRequest, internalFrameworkRequest } from '../../lib/framework';
import { KpiHosts } from '../../lib/kpi_hosts';
import { KpiHostsAdapter } from '../../lib/kpi_hosts/types';
import { SourceStatus } from '../../lib/source_status';
import { Sources } from '../../lib/sources';
import { createSourcesResolvers } from '../sources';
import { SourcesResolversDeps } from '../sources/resolvers';
import { mockSourcesAdapter, mockSourceStatusAdapter } from '../sources/resolvers.test';

import { mockKpiHostsData } from './kpi_hosts.mock';
import { createKpiHostsResolvers, KpiHostsResolversDeps } from './resolvers';

const mockGetKpiHosts = jest.fn();
mockGetKpiHosts.mockResolvedValue({
  KpiHosts: {
    ...mockKpiHostsData.KpiHosts,
  },
});
const mockKpiHostsAdapter: KpiHostsAdapter = {
  getKpiHosts: mockGetKpiHosts,
};

const mockKpiHostsLibs: KpiHostsResolversDeps = {
  kpiHosts: new KpiHosts(mockKpiHostsAdapter),
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
  test('Make sure that getKpiHosts have been called', async () => {
    const source = await createSourcesResolvers(mockSrcLibs).Query.source(
      {},
      { id: 'default' },
      context,
      {} as GraphQLResolveInfo
    );
    const data = await createKpiHostsResolvers(mockKpiHostsLibs).Source.KpiHosts(
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
    expect(mockKpiHostsAdapter.getKpiHosts).toHaveBeenCalled();
    expect(data).toEqual(mockKpiHostsData);
  });
});
