/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { GraphQLResolveInfo } from 'graphql';

import { Source } from '../../graphql/types';
import { Authentications } from '../../lib/authentications';
import { AuthenticationsAdapter } from '../../lib/authentications/types';
import { FrameworkRequest, internalFrameworkRequest } from '../../lib/framework';
import { SourceStatus } from '../../lib/source_status';
import { Sources } from '../../lib/sources';
import { createSourcesResolvers } from '../sources';
import { SourcesResolversDeps } from '../sources/resolvers';
import { mockSourcesAdapter, mockSourceStatusAdapter } from '../sources/resolvers.test';

import { mockAuthenticationsData, mockAuthenticationsFields } from './authentications.mock';
import { AuthenticationsResolversDeps, createAuthenticationsResolvers } from './resolvers';

const mockGetFields = jest.fn();
mockGetFields.mockResolvedValue({ fieldNodes: [mockAuthenticationsFields] });
jest.doMock('../../utils/build_query/fields', () => ({
  getFields: mockGetFields,
}));

const mockGetAuthentications = jest.fn();
mockGetAuthentications.mockResolvedValue({
  Authentications: {
    ...mockAuthenticationsData.Authentications,
  },
});
const mockAuthenticationsAdapter: AuthenticationsAdapter = {
  getAuthentications: mockGetAuthentications,
};

const mockAuthenticationsLibs: AuthenticationsResolversDeps = {
  authentications: new Authentications(mockAuthenticationsAdapter),
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
  test('Make sure that getAuthenticationss have been called', async () => {
    const source = await createSourcesResolvers(mockSrcLibs).Query.source(
      {},
      { id: 'default' },
      context,
      {} as GraphQLResolveInfo
    );
    const data = await createAuthenticationsResolvers(
      mockAuthenticationsLibs
    ).Source.Authentications(
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
    expect(mockAuthenticationsAdapter.getAuthentications).toHaveBeenCalled();
    expect(data).toEqual(mockAuthenticationsData);
  });
});
