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

import {
  mockEventsData,
  mockEventsFields,
  mockLastEventTimeData,
  mockTimelineData,
  mockTimelineDetailsData,
} from './events.mock';
import { createEventsResolvers, EventsResolversDeps } from './resolvers';

const mockGetFields = jest.fn();
mockGetFields.mockResolvedValue({ fieldNodes: [mockEventsFields] });
jest.doMock('../../utils/build_query/fields', () => ({
  getFields: mockGetFields,
}));

const mockGetEvents = jest.fn();
mockGetEvents.mockResolvedValue({
  Events: {
    ...mockEventsData.Events,
  },
});
const mockGetTimeline = jest.fn();
mockGetTimeline.mockResolvedValue({
  Timeline: {
    ...mockTimelineData.Timeline,
  },
});
const mockGetLastEventTime = jest.fn();
mockGetLastEventTime.mockResolvedValue({
  LastEventTime: {
    ...mockLastEventTimeData.LastEventTime,
  },
});
const mockGetTimelineDetails = jest.fn();
mockGetTimelineDetails.mockResolvedValue({
  TimelineDetails: {
    ...mockTimelineDetailsData.TimelineDetails,
  },
});
const mockEventsAdapter: EventsAdapter = {
  getEvents: mockGetEvents,
  getTimelineDetails: mockGetTimelineDetails,
  getTimelineData: mockGetTimeline,
  getLastEventTimeData: mockGetLastEventTime,
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
    context.req.payload.operationName = 'events';
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
    });
  });

  test('Make sure that getTimelineData have been called', async () => {
    context.req.payload.operationName = 'timeline';
    const source = await createSourcesResolvers(mockSrcLibs).Query.source(
      {},
      { id: 'default' },
      context,
      {} as GraphQLResolveInfo
    );
    const data = await createEventsResolvers(mockEventsLibs).Source.Timeline(
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
        fieldRequested: ['@timestamp', 'host.name'],
      },
      context,
      {} as GraphQLResolveInfo
    );
    expect(mockEventsAdapter.getTimelineData).toHaveBeenCalled();
    expect(data).toEqual({ Timeline: { ...mockTimelineData.Timeline } });
  });

  test('Make sure that getTimelineDetails have been called', async () => {
    context.req.payload.operationName = 'details';
    const source = await createSourcesResolvers(mockSrcLibs).Query.source(
      {},
      { id: 'default' },
      context,
      {} as GraphQLResolveInfo
    );
    const data = await createEventsResolvers(mockEventsLibs).Source.TimelineDetails(
      source as Source,
      {
        indexName: 'filebeat-7.0.0-iot-2019.06',
        eventId: 'QRhG1WgBqd-n62SwZYDT',
      },
      context,
      {} as GraphQLResolveInfo
    );
    expect(mockEventsAdapter.getTimelineDetails).toHaveBeenCalled();
    expect(data).toEqual({ TimelineDetails: { ...mockTimelineDetailsData.TimelineDetails } });
  });
});
