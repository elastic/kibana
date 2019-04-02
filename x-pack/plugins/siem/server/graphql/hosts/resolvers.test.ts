/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { GraphQLResolveInfo } from 'graphql';
import { omit } from 'lodash/fp';

import { Source } from '../../graphql/types';
import { FrameworkRequest, internalFrameworkRequest } from '../../lib/framework';
import { Hosts } from '../../lib/hosts';
import { HostsAdapter } from '../../lib/hosts/types';
import { SourceStatus } from '../../lib/source_status';
import { Sources } from '../../lib/sources';
import { createSourcesResolvers } from '../sources';
import { SourcesResolversDeps } from '../sources/resolvers';
import { mockSourcesAdapter, mockSourceStatusAdapter } from '../sources/resolvers.test';

import { mockHostsData, mockHostsFields } from './hosts.mock';
import { createHostsResolvers, HostsResolversDeps } from './resolvers';

const mockGetFields = jest.fn();
mockGetFields.mockResolvedValue({ fieldNodes: [mockHostsFields] });
jest.mock('../../utils/build_query/fields', () => ({
  getFields: mockGetFields,
}));

const mockGetHosts = jest.fn();
mockGetHosts.mockResolvedValue({
  Hosts: {
    ...mockHostsData.Hosts,
  },
});
const mockHostsAdapter: HostsAdapter = {
  getHosts: mockGetHosts,
};

const mockHostsLibs: HostsResolversDeps = {
  hosts: new Hosts(mockHostsAdapter),
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
  test('Make sure that getHosts have been called', async () => {
    const source = await createSourcesResolvers(mockSrcLibs).Query.source(
      {},
      { id: 'default' },
      context,
      {} as GraphQLResolveInfo
    );
    const data = await createHostsResolvers(mockHostsLibs).Source.Hosts(
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
      },
      context,
      {} as GraphQLResolveInfo
    );
    expect(mockHostsAdapter.getHosts).toHaveBeenCalled();
    expect(data).toEqual(omit('status', mockHostsData));
  });
});
