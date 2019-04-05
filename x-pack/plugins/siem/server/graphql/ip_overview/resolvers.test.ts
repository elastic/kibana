/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { GraphQLResolveInfo } from 'graphql';
import { omit } from 'lodash/fp';

import { Source } from '../../graphql/types';
import { FrameworkRequest, internalFrameworkRequest } from '../../lib/framework';
import { IpOverview } from '../../lib/ip_overview';
import { IpOverviewAdapter } from '../../lib/ip_overview/types';
import { SourceStatus } from '../../lib/source_status';
import { Sources } from '../../lib/sources';
import { createSourcesResolvers } from '../sources';
import { SourcesResolversDeps } from '../sources/resolvers';
import { mockSourcesAdapter, mockSourceStatusAdapter } from '../sources/resolvers.test';

import { mockIpOverviewData, mockIpOverviewFields } from './ip_overview.mock';
import { createIpOverviewResolvers, IpOverviewResolversDeps } from './resolvers';

const mockGetFields = jest.fn();
mockGetFields.mockResolvedValue({ fieldNodes: [mockIpOverviewFields] });
jest.doMock('../../utils/build_query/fields', () => ({
  getFields: mockGetFields,
}));

const mockIpOverview = jest.fn();
mockIpOverview.mockResolvedValue({
  IpOverview: {
    ...mockIpOverviewData.IpOverview,
  },
});
const mockIpOverviewAdapter: IpOverviewAdapter = {
  getIpOverview: mockIpOverview,
};

const mockIpOverviewLibs: IpOverviewResolversDeps = {
  ipOverview: new IpOverview(mockIpOverviewAdapter),
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
  test('Make sure that getIpOverview have been called', async () => {
    const source = await createSourcesResolvers(mockSrcLibs).Query.source(
      {},
      { id: 'default' },
      context,
      {} as GraphQLResolveInfo
    );
    const data = await createIpOverviewResolvers(mockIpOverviewLibs).Source.IpOverview(
      source as Source,
      {
        ip: '10.10.10.10',
      },
      context,
      {} as GraphQLResolveInfo
    );
    expect(mockIpOverviewAdapter.getIpOverview).toHaveBeenCalled();
    expect(data).toEqual(omit('status', mockIpOverviewData));
  });
});
