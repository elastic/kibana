/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { GraphQLResolveInfo } from 'graphql';
import { omit } from 'lodash/fp';

import { Source } from '../../graphql/types';
import { FrameworkRequest, internalFrameworkRequest } from '../../lib/framework';
import { IpDetails } from '../../lib/ip_details';
import { IpDetailsAdapter } from '../../lib/ip_details/types';
import { SourceStatus } from '../../lib/source_status';
import { Sources } from '../../lib/sources';
import { createSourcesResolvers } from '../sources';
import { SourcesResolversDeps } from '../sources/resolvers';
import { mockSourcesAdapter, mockSourceStatusAdapter } from '../sources/resolvers.test';

import { mockDomainsData, mockIpOverviewData, mockIpOverviewFields } from './ip_details.mock';
import { createIpDetailsResolvers, IDetailsResolversDeps } from './resolvers';

const mockGetFields = jest.fn();
mockGetFields.mockResolvedValue({ fieldNodes: [mockIpOverviewFields] });
jest.mock('../../utils/build_query/fields', () => ({
  getFields: mockGetFields,
}));

const mockIpOverview = jest.fn();
mockIpOverview.mockResolvedValue({
  IpOverview: {
    ...mockIpOverviewData.IpOverview,
  },
});
const mockDomains = jest.fn();
mockDomains.mockResolvedValue({
  Domains: {
    ...mockDomainsData.Domains,
  },
});
const mockIpDetailsAdapter: IpDetailsAdapter = {
  getIpDetails: mockIpOverview,
  getDomains: mockDomains,
};

const mockIpDetailsLibs: IDetailsResolversDeps = {
  ipDetails: new IpDetails(mockIpDetailsAdapter),
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
    const data = await createIpDetailsResolvers(mockIpDetailsLibs).Source.IpOverview(
      source as Source,
      {
        ip: '10.10.10.10',
      },
      context,
      {} as GraphQLResolveInfo
    );
    expect(mockIpDetailsAdapter.getIpDetails).toHaveBeenCalled();
    expect(data).toEqual(omit('status', mockIpOverviewData));
  });
});
