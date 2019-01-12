/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { GraphQLResolveInfo } from 'graphql';
import { omit } from 'lodash/fp';

import { Source } from '../../graphql/types';
import { Authorizations } from '../../lib/authorizations';
import { AuthorizationsAdapter } from '../../lib/authorizations/types';
import { FrameworkRequest, internalFrameworkRequest } from '../../lib/framework';
import { SourceStatus } from '../../lib/source_status';
import { Sources } from '../../lib/sources';
import { createSourcesResolvers } from '../sources';
import { SourcesResolversDeps } from '../sources/resolvers';
import { mockSourcesAdapter, mockSourceStatusAdapter } from '../sources/resolvers.test';
import { mockAuthorizationsData, mockAuthorizationsFields } from './authorizations.mock';
import { AuthorizationsResolversDeps, createAuthorizationsResolvers } from './resolvers';

const mockGetFields = jest.fn();
mockGetFields.mockResolvedValue({ fieldNodes: [mockAuthorizationsFields] });
jest.mock('../../utils/build_query/fields', () => ({
  getFields: mockGetFields,
}));

const mockGetAuthorizations = jest.fn();
mockGetAuthorizations.mockResolvedValue({
  Authorizations: {
    ...mockAuthorizationsData.Authorizations,
  },
});
const mockAuthorizationsAdapter: AuthorizationsAdapter = {
  getAuthorizations: mockGetAuthorizations,
};

const mockAuthorizationsLibs: AuthorizationsResolversDeps = {
  authorizations: new Authorizations(mockAuthorizationsAdapter),
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
  test('Make sure that getAuthorizations have been called', async () => {
    const source = await createSourcesResolvers(mockSrcLibs).Query.source(
      {},
      { id: 'default' },
      context,
      {} as GraphQLResolveInfo
    );
    const data = await createAuthorizationsResolvers(mockAuthorizationsLibs).Source.Authorizations(
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
    expect(mockAuthorizationsAdapter.getAuthorizations).toHaveBeenCalled();
    expect(data).toEqual(omit('status', mockAuthorizationsData));
  });
});
