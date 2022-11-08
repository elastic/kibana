/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FrameworkRequest } from '../../../framework';

import { getAllPinnedEventsByTimelineId, PINNED_EVENTS_PER_PAGE } from '.';

describe('pinned events', () => {
  let mockFindSavedObject: jest.Mock;
  let mockRequest: FrameworkRequest;

  beforeEach(() => {
    jest.clearAllMocks();

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

  describe('getAllPinnedEventsByTimelineId', () => {
    it(`overrides the saved object service's FIND_DEFAULT_PER_PAGE default for the perPage option`, async () => {
      await getAllPinnedEventsByTimelineId(mockRequest, 'test');

      expect(mockFindSavedObject.mock.calls[0][0].perPage).toEqual(PINNED_EVENTS_PER_PAGE);
    });
  });
});
