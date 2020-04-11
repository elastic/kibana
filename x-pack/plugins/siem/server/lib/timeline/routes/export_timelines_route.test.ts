/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  mockTimelines,
  mockNotes,
  mockTimelinesSavedObjects,
  mockPinnedEvents,
  getExportTimelinesRequest,
} from './__mocks__/request_responses';
import { exportTimelinesRoute } from './export_timelines_route';
import {
  serverMock,
  requestContextMock,
  requestMock,
} from '../../detection_engine/routes/__mocks__';
import { TIMELINE_EXPORT_URL } from 'siem/common/constants';
import { convertSavedObjectToSavedNote } from '../../note/saved_object';
import { convertSavedObjectToSavedPinnedEvent } from '../../pinned_event/saved_object';
import { convertSavedObjectToSavedTimeline } from '../convert_saved_object_to_savedtimeline';
jest.mock('../convert_saved_object_to_savedtimeline', () => {
  return {
    convertSavedObjectToSavedTimeline: jest.fn(),
  };
});

jest.mock('../../note/saved_object', () => {
  return {
    convertSavedObjectToSavedNote: jest.fn(),
  };
});

jest.mock('../../pinned_event/saved_object', () => {
  return {
    convertSavedObjectToSavedPinnedEvent: jest.fn(),
  };
});
describe('export timelines', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();
  const config = jest.fn().mockImplementation(() => {
    return {
      get: () => {
        return 100;
      },
      has: jest.fn(),
    };
  });

  beforeEach(() => {
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());

    clients.savedObjectsClient.bulkGet.mockResolvedValue(mockTimelinesSavedObjects());

    ((convertSavedObjectToSavedTimeline as unknown) as jest.Mock).mockReturnValue(mockTimelines());
    ((convertSavedObjectToSavedNote as unknown) as jest.Mock).mockReturnValue(mockNotes());
    ((convertSavedObjectToSavedPinnedEvent as unknown) as jest.Mock).mockReturnValue(
      mockPinnedEvents()
    );
    exportTimelinesRoute(server.router, config);
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
        'Invalid value undefined supplied to : { ids: Array<string> }/ids: Array<string>'
      );
    });

    test('return validation error for request params', async () => {
      const request = requestMock.create({
        method: 'get',
        path: TIMELINE_EXPORT_URL,
        body: { id: 'someId' },
      });
      const result = server.validate(request);

      expect(result.badRequest.mock.calls[1][0]).toEqual(
        [
          'Invalid value undefined supplied to : { file_name: string, exclude_export_details: ("true" | "false") }/file_name: string',
          'Invalid value undefined supplied to : { file_name: string, exclude_export_details: ("true" | "false") }/exclude_export_details: ("true" | "false")/0: "true"',
          'Invalid value undefined supplied to : { file_name: string, exclude_export_details: ("true" | "false") }/exclude_export_details: ("true" | "false")/1: "false"',
        ].join('\n')
      );
    });
  });
});
