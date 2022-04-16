/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FrameworkRequest } from '../../../framework';
import { mockGetTimelineValue, mockSavedObject } from '../../__mocks__/import_timelines';

import {
  convertStringToBase64,
  getExistingPrepackagedTimelines,
  getAllTimeline,
  resolveTimelineOrNull,
} from '.';
import { convertSavedObjectToSavedTimeline } from './convert_saved_object_to_savedtimeline';
import { getNotesByTimelineId } from '../notes/saved_object';
import { getAllPinnedEventsByTimelineId } from '../pinned_events';
import {
  AllTimelinesResponse,
  ResolvedTimelineWithOutcomeSavedObject,
} from '../../../../../common/types/timeline';
import {
  mockResolvedSavedObject,
  mockResolvedTimeline,
  mockResolveTimelineResponse,
} from '../../__mocks__/resolve_timeline';
import { DATA_VIEW_ID_REF_NAME, SAVED_QUERY_ID_REF_NAME, SAVED_QUERY_TYPE } from '../../constants';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';

jest.mock('./convert_saved_object_to_savedtimeline', () => ({
  convertSavedObjectToSavedTimeline: jest.fn(),
}));

jest.mock('../notes/saved_object', () => ({
  getNotesByTimelineId: jest.fn().mockResolvedValue([]),
}));

jest.mock('../pinned_events', () => ({
  getAllPinnedEventsByTimelineId: jest.fn().mockResolvedValue([]),
}));

describe('saved_object', () => {
  describe('convertStringToBase64', () => {
    test('it should base 64 encode a string such as the word "Frank"', () => {
      expect(convertStringToBase64('Frank')).toBe('RnJhbms=');
    });

    test('it should base 64 encode a large string such as the "Some very long string for you"', () => {
      expect(convertStringToBase64('Some very long string for you')).toBe(
        'U29tZSB2ZXJ5IGxvbmcgc3RyaW5nIGZvciB5b3U='
      );
    });

    test('it should base 64 encode a empty string as an empty string', () => {
      expect(convertStringToBase64('')).toBe('');
    });
  });

  describe('getExistingPrepackagedTimelines', () => {
    let mockFindSavedObject: jest.Mock;
    let mockRequest: FrameworkRequest;

    beforeEach(() => {
      mockFindSavedObject = jest.fn().mockResolvedValue({ saved_objects: [], total: 0 });
      mockRequest = {
        user: {
          username: 'username',
        },
        context: {
          core: {
            savedObjects: {
              client: {
                find: mockFindSavedObject,
              },
            },
          },
        },
      } as unknown as FrameworkRequest;
    });

    afterEach(() => {
      mockFindSavedObject.mockClear();
      (getNotesByTimelineId as jest.Mock).mockClear();
      (getAllPinnedEventsByTimelineId as jest.Mock).mockClear();
    });

    test('should send correct options if countsOnly is true', async () => {
      const contsOnly = true;
      await getExistingPrepackagedTimelines(mockRequest, contsOnly);
      expect(mockFindSavedObject).toBeCalledWith({
        filter:
          'siem-ui-timeline.attributes.timelineType: template and not siem-ui-timeline.attributes.status: draft and siem-ui-timeline.attributes.status: immutable',
        page: 1,
        perPage: 1,
        type: 'siem-ui-timeline',
      });
    });

    test('should send correct options if countsOnly is false', async () => {
      const contsOnly = false;
      await getExistingPrepackagedTimelines(mockRequest, contsOnly);
      expect(mockFindSavedObject).toBeCalledWith({
        filter:
          'siem-ui-timeline.attributes.timelineType: template and not siem-ui-timeline.attributes.status: draft and siem-ui-timeline.attributes.status: immutable',
        type: 'siem-ui-timeline',
      });
    });

    test('should send correct options if pageInfo is given', async () => {
      const contsOnly = false;
      const pageInfo = {
        pageSize: 10,
        pageIndex: 1,
      };
      await getExistingPrepackagedTimelines(mockRequest, contsOnly, pageInfo);
      expect(mockFindSavedObject).toBeCalledWith({
        filter:
          'siem-ui-timeline.attributes.timelineType: template and not siem-ui-timeline.attributes.status: draft and siem-ui-timeline.attributes.status: immutable',
        page: 1,
        perPage: 10,
        type: 'siem-ui-timeline',
      });
    });
  });

  describe('getAllTimeline', () => {
    let mockFindSavedObject: jest.Mock;
    let mockRequest: FrameworkRequest;
    const pageInfo = {
      pageSize: 10,
      pageIndex: 1,
    };
    let result = null as unknown as AllTimelinesResponse;
    beforeEach(async () => {
      (convertSavedObjectToSavedTimeline as jest.Mock).mockReturnValue(mockGetTimelineValue);
      mockFindSavedObject = jest
        .fn()
        .mockResolvedValueOnce({ saved_objects: [mockSavedObject], total: 1 })
        .mockResolvedValueOnce({ saved_objects: [], total: 0 })
        .mockResolvedValueOnce({ saved_objects: [mockSavedObject], total: 1 })
        .mockResolvedValueOnce({ saved_objects: [mockSavedObject], total: 1 })
        .mockResolvedValue({ saved_objects: [], total: 0 });
      mockRequest = {
        user: {
          username: 'username',
        },
        context: {
          core: {
            savedObjects: {
              client: {
                find: mockFindSavedObject,
              },
            },
          },
        },
      } as unknown as FrameworkRequest;

      result = await getAllTimeline(mockRequest, false, pageInfo, null, null, null, null);
    });

    afterEach(() => {
      mockFindSavedObject.mockClear();
      (getNotesByTimelineId as jest.Mock).mockClear();
      (getAllPinnedEventsByTimelineId as jest.Mock).mockClear();
    });

    test('should send correct options if no filters applies', async () => {
      expect(mockFindSavedObject.mock.calls[0][0]).toEqual({
        filter: 'not siem-ui-timeline.attributes.status: draft',
        page: pageInfo.pageIndex,
        perPage: pageInfo.pageSize,
        type: 'siem-ui-timeline',
        sortField: undefined,
        sortOrder: undefined,
        search: undefined,
        searchFields: ['title', 'description'],
      });
    });

    test('should send correct options for counts of default timelines', async () => {
      expect(mockFindSavedObject.mock.calls[1][0]).toEqual({
        filter:
          'not siem-ui-timeline.attributes.timelineType: template and not siem-ui-timeline.attributes.status: draft and not siem-ui-timeline.attributes.status: immutable',
        page: 1,
        perPage: 1,
        type: 'siem-ui-timeline',
      });
    });

    test('should send correct options for counts of timeline templates', async () => {
      expect(mockFindSavedObject.mock.calls[2][0]).toEqual({
        filter:
          'siem-ui-timeline.attributes.timelineType: template and not siem-ui-timeline.attributes.status: draft',
        page: 1,
        perPage: 1,
        type: 'siem-ui-timeline',
      });
    });

    test('should send correct options for counts of Elastic prebuilt templates', async () => {
      expect(mockFindSavedObject.mock.calls[3][0]).toEqual({
        filter:
          'siem-ui-timeline.attributes.timelineType: template and not siem-ui-timeline.attributes.status: draft and siem-ui-timeline.attributes.status: immutable',
        page: 1,
        perPage: 1,
        type: 'siem-ui-timeline',
      });
    });

    test('should send correct options for counts of custom templates', async () => {
      expect(mockFindSavedObject.mock.calls[4][0]).toEqual({
        filter:
          'siem-ui-timeline.attributes.timelineType: template and not siem-ui-timeline.attributes.status: draft and not siem-ui-timeline.attributes.status: immutable',
        page: 1,
        perPage: 1,
        type: 'siem-ui-timeline',
      });
    });

    test('should send correct options for counts of favorite timeline', async () => {
      expect(mockFindSavedObject.mock.calls[5][0]).toEqual({
        filter:
          'not siem-ui-timeline.attributes.status: draft and not siem-ui-timeline.attributes.status: immutable and siem-ui-timeline.attributes.favorite.keySearch: dXNlcm5hbWU=',
        page: 1,
        perPage: 1,
        searchFields: ['title', 'description'],
        type: 'siem-ui-timeline',
      });
    });

    test('should call getNotesByTimelineId', async () => {
      expect((getNotesByTimelineId as jest.Mock).mock.calls[0][1]).toEqual(mockSavedObject.id);
    });

    test('should call getAllPinnedEventsByTimelineId', async () => {
      expect((getAllPinnedEventsByTimelineId as jest.Mock).mock.calls[0][1]).toEqual(
        mockSavedObject.id
      );
    });

    test('should return correct result', async () => {
      expect(result).toEqual({
        totalCount: 1,
        customTemplateTimelineCount: 0,
        defaultTimelineCount: 0,
        elasticTemplateTimelineCount: 1,
        favoriteCount: 0,
        templateTimelineCount: 1,
        timeline: [
          {
            ...mockGetTimelineValue,
            noteIds: [],
            pinnedEventIds: [],
            eventIdToNoteIds: [],
            favorite: [],
            notes: [],
            pinnedEventsSaveObject: [],
          },
        ],
      });
    });
  });

  describe('resolveTimelineOrNull', () => {
    let mockResolveSavedObject: jest.Mock;
    let mockRequest: FrameworkRequest;
    let result: ResolvedTimelineWithOutcomeSavedObject | null = null;
    beforeEach(async () => {
      (convertSavedObjectToSavedTimeline as jest.Mock).mockReturnValue(mockResolvedTimeline);
      mockResolveSavedObject = jest.fn().mockReturnValue(mockResolvedSavedObject);
      mockRequest = {
        user: {
          username: 'username',
        },
        context: {
          core: {
            savedObjects: {
              client: {
                resolve: mockResolveSavedObject,
              },
            },
          },
        },
      } as unknown as FrameworkRequest;

      result = await resolveTimelineOrNull(mockRequest, '760d3d20-2142-11ec-a46f-051cb8e3154c');
    });

    afterEach(() => {
      mockResolveSavedObject.mockClear();
      (getNotesByTimelineId as jest.Mock).mockClear();
      (getAllPinnedEventsByTimelineId as jest.Mock).mockClear();
    });

    test('should call getNotesByTimelineId', async () => {
      expect((getNotesByTimelineId as jest.Mock).mock.calls[0][1]).toEqual(
        mockResolvedSavedObject.saved_object.id
      );
    });

    test('should call getAllPinnedEventsByTimelineId', async () => {
      expect((getAllPinnedEventsByTimelineId as jest.Mock).mock.calls[0][1]).toEqual(
        mockResolvedSavedObject.saved_object.id
      );
    });

    test('should return the timeline with resolve attributes', async () => {
      expect(result).toEqual(mockResolveTimelineResponse);
    });
  });
  describe('field migrator', () => {
    let mockResolveSavedObject: jest.Mock;
    const convertSavedObjectToSavedTimelineMock: jest.Mock =
      convertSavedObjectToSavedTimeline as jest.Mock;
    let mockRequest: FrameworkRequest;
    beforeEach(async () => {
      jest.clearAllMocks();
      convertSavedObjectToSavedTimelineMock.mockReturnValue(mockResolvedTimeline);
      mockResolveSavedObject = jest.fn().mockReturnValue({
        ...mockResolvedSavedObject,
        saved_object: {
          ...mockResolvedSavedObject.saved_object,
          references: [
            {
              id: 'boo',
              name: SAVED_QUERY_ID_REF_NAME,
              type: SAVED_QUERY_TYPE,
            },
            {
              id: 'also-boo',
              name: DATA_VIEW_ID_REF_NAME,
              type: DATA_VIEW_SAVED_OBJECT_TYPE,
            },
          ],
        },
      });
      mockRequest = {
        user: {
          username: 'username',
        },
        context: {
          core: {
            savedObjects: {
              client: {
                resolve: mockResolveSavedObject,
              },
            },
          },
        },
      } as unknown as FrameworkRequest;

      await resolveTimelineOrNull(mockRequest, '760d3d20-2142-11ec-a46f-051cb8e3154c');
    });

    test('the fields we track in references are converted to attributes when SO is requested', () => {
      const { attributes } = convertSavedObjectToSavedTimelineMock.mock.calls[0][0];
      expect(attributes.dataViewId).toEqual('also-boo');
      expect(attributes.savedQueryId).toEqual('boo');
    });
  });
});
