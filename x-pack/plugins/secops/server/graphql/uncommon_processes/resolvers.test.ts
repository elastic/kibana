/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { GraphQLResolveInfo } from 'graphql';
import { omit } from 'lodash/fp';

import { Source } from '.../../../common/graphql/types';
import { FrameworkRequest, internalFrameworkRequest } from '../../lib/framework';
import { SourceStatus } from '../../lib/source_status';
import { Sources } from '../../lib/sources';
import { UncommonProcesses } from '../../lib/uncommon_processes';
import { UncommonProcessesAdapter } from '../../lib/uncommon_processes/types';
import { createSourcesResolvers } from '../sources';
import { SourcesResolversDeps } from '../sources/resolvers';
import { mockSourcesAdapter, mockSourceStatusAdapter } from '../sources/resolvers.test';
import { createUncommonProcessesResolvers, UncommonProcessesResolversDeps } from './resolvers';
import { mockUncommonProcessesData, mockUncommonProcessesFields } from './uncommon_processes.mock';

const mockGetFields = jest.fn();
mockGetFields.mockResolvedValue({ fieldNodes: [mockUncommonProcessesFields] });
jest.mock('../../utils/build_query/fields', () => ({
  getFields: mockGetFields,
}));

const mockGetUncommonProcesses = jest.fn();
mockGetUncommonProcesses.mockResolvedValue({
  UncommonProcesses: {
    ...mockUncommonProcessesData.UncommonProcesses,
  },
});
const mockUncommonProcessesAdapter: UncommonProcessesAdapter = {
  getUncommonProcesses: mockGetUncommonProcesses,
};

const mockUncommonProcessesLibs: UncommonProcessesResolversDeps = {
  uncommonProcesses: new UncommonProcesses(mockUncommonProcessesAdapter),
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
  test('Make sure that getUncommonProcesses have been called', async () => {
    const source = await createSourcesResolvers(mockSrcLibs).Query.source(
      null,
      { id: 'default' },
      context,
      {} as GraphQLResolveInfo
    );
    const data = await createUncommonProcessesResolvers(
      mockUncommonProcessesLibs
    ).Source.UncommonProcesses(
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
    expect(mockUncommonProcessesAdapter.getUncommonProcesses).toHaveBeenCalled();
    expect(data).toEqual(omit('status', mockUncommonProcessesData));
  });
});
