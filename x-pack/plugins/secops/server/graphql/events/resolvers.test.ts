/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { GraphQLResolveInfo } from 'graphql';

import { Direction, Source } from '../../graphql/types';
import { Events } from '../../lib/events';
import { EventsAdapter } from '../../lib/events/types';
import { FrameworkRequest, internalFrameworkRequest } from '../../lib/framework';
import { SourceStatus } from '../../lib/source_status';
import { Sources } from '../../lib/sources';
import { createSourcesResolvers } from '../sources';
import { SourcesResolversDeps } from '../sources/resolvers';
import { mockSourcesAdapter, mockSourceStatusAdapter } from '../sources/resolvers.test';

import { mockEventsData, mockEventsFields } from './events.mock';
import { createEventsResolvers, EventsResolversDeps } from './resolvers';

const mockGetFields = jest.fn();
mockGetFields.mockResolvedValue({ fieldNodes: [mockEventsFields] });
jest.mock('../../utils/build_query/fields', () => ({
  getFields: mockGetFields,
}));

const mockGetEvents = jest.fn();
mockGetEvents.mockResolvedValue({
  Events: {
    ...mockEventsData.Events,
  },
  EventDetails: {
    data: [],
  },
});
const mockEventsAdapter: EventsAdapter = {
  getEvents: mockGetEvents,
  getEventDetails: mockGetEvents,
};

const mockEventsLibs: EventsResolversDeps = {
  events: new Events(mockEventsAdapter),
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
  test('Make sure that getEvents have been called', async () => {
    const source = await createSourcesResolvers(mockSrcLibs).Query.source(
      {},
      { id: 'default' },
      context,
      {} as GraphQLResolveInfo
    );
    const data = await createEventsResolvers(mockEventsLibs).Source.Events(
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
        sortField: {
          sortFieldId: 'timestamp',
          direction: Direction.desc,
        },
      },
      context,
      {} as GraphQLResolveInfo
    );
    expect(mockEventsAdapter.getEvents).toHaveBeenCalled();
    expect(data).toEqual({
      Events: {
        ...mockEventsData.Events,
      },
      EventDetails: {
        data: [],
      },
    });
  });
});
