/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mockTimelines,
  mockNotes,
  mockTimelinesSavedObjects,
  mockPinnedEvents,
  getExportTimelinesRequest,
} from '../../../__mocks__/request_responses';
import { exportTimelinesRoute } from '.';
import {
  serverMock,
  requestContextMock,
  requestMock,
  createMockConfig,
} from '../../../../detection_engine/routes/__mocks__';
import { TIMELINE_EXPORT_URL } from '../../../../../../common/constants';
import { convertSavedObjectToSavedNote } from '../../../saved_object/notes/saved_object';
import { convertSavedObjectToSavedPinnedEvent } from '../../../saved_object/pinned_events';
import { convertSavedObjectToSavedTimeline } from '../../../saved_object/timelines/convert_saved_object_to_savedtimeline';
import { mockGetCurrentUser } from '../../../__mocks__/import_timelines';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';

jest.mock('../../../saved_object/timelines/convert_saved_object_to_savedtimeline', () => {
  return {
    convertSavedObjectToSavedTimeline: jest.fn(),
  };
});

jest.mock('../../../saved_object/notes/saved_object', () => {
  return {
    convertSavedObjectToSavedNote: jest.fn(),
    getNotesByTimelineId: jest.fn().mockReturnValue([]),
  };
});

jest.mock('../../../saved_object/pinned_events', () => {
  return {
    convertSavedObjectToSavedPinnedEvent: jest.fn(),
    getAllPinnedEventsByTimelineId: jest.fn().mockReturnValue([]),
  };
});
describe('export timelines', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  let securitySetup: SecurityPluginSetup;

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    securitySetup = {
      authc: {
        getCurrentUser: jest.fn().mockReturnValue(mockGetCurrentUser),
      },
      authz: {},
    } as unknown as SecurityPluginSetup;
    clients.savedObjectsClient.bulkGet.mockResolvedValue(mockTimelinesSavedObjects());

    (convertSavedObjectToSavedTimeline as unknown as jest.Mock).mockReturnValue(mockTimelines());
    (convertSavedObjectToSavedNote as unknown as jest.Mock).mockReturnValue(mockNotes());
    (convertSavedObjectToSavedPinnedEvent as unknown as jest.Mock).mockReturnValue(
      mockPinnedEvents()
    );
    exportTimelinesRoute(server.router, createMockConfig(), securitySetup);
  });

  describe('status codes', () => {
    test('returns 200 when finding selected timelines', async () => {
      const response = await server.inject(getExportTimelinesRequest(), context);
      expect(response.status).toEqual(200);
    });

    test('catch error when status search throws error', async () => {
      clients.savedObjectsClient.bulkGet.mockReset();
      clients.savedObjectsClient.bulkGet.mockRejectedValue(new Error('Test error'));
      const response = await server.inject(getExportTimelinesRequest(), context);
      expect(response.status).toEqual(500);
      expect(response.body).toEqual({
        message: 'Test error',
        status_code: 500,
      });
    });
  });

  describe('request validation', () => {
    test('return validation error for request body', async () => {
      const request = requestMock.create({
        method: 'get',
        path: TIMELINE_EXPORT_URL,
        body: { id: 'someId' },
      });
      const result = server.validate(request);

      expect(result.badRequest.mock.calls[0][0]).toEqual(
        'Invalid value {"id":"someId"}, excess properties: ["id"]'
      );
    });

    test('return validation error for request params', async () => {
      const request = requestMock.create({
        method: 'get',
        path: TIMELINE_EXPORT_URL,
        query: { file_name: 'test.ndjson' },
        body: { ids: 'someId' },
      });
      const result = server.validate(request);

      expect(result.badRequest.mock.calls[0][0]).toEqual(
        'Invalid value "someId" supplied to "ids"'
      );
    });
  });
});
