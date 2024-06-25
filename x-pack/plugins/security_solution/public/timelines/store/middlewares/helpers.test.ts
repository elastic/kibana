/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockStore, kibanaMock, mockGlobalState } from '../../../common/mock';
import { TimelineId } from '../../../../common/types/timeline';
import { TimelineStatus } from '../../../../common/api/timeline';
import { persistTimeline } from '../../containers/api';
import { ensureTimelineIsSaved } from './helpers';

jest.mock('../../containers/api');

describe('Timeline middleware helpers', () => {
  describe('ensureTimelineIsSaved', () => {
    let store = createMockStore(undefined, undefined, kibanaMock);

    beforeEach(() => {
      store = createMockStore(undefined, undefined, kibanaMock);
      jest.clearAllMocks();
    });

    it('should return the given timeline if it has a `savedObjectId`', async () => {
      const testTimeline = {
        ...mockGlobalState.timeline.timelineById[TimelineId.test],
        savedObjectId: '123',
      };
      const returnedTimeline = await ensureTimelineIsSaved({
        localTimelineId: TimelineId.test,
        timeline: testTimeline,
        store,
      });

      expect(returnedTimeline).toBe(testTimeline);
    });

    it('should return a draft timeline with a savedObjectId when an unsaved timeline is passed', async () => {
      const mockSavedObjectId = 'mockSavedObjectId';
      (persistTimeline as jest.Mock).mockResolvedValue({
        data: {
          persistTimeline: {
            code: 200,
            message: 'success',
            timeline: {
              ...mockGlobalState.timeline.timelineById[TimelineId.test],
              savedObjectId: mockSavedObjectId,
            },
          },
        },
      });

      const returnedTimeline = await ensureTimelineIsSaved({
        localTimelineId: TimelineId.test,
        timeline: mockGlobalState.timeline.timelineById[TimelineId.test],
        store,
      });

      expect(returnedTimeline.savedObjectId).toBe(mockSavedObjectId);
      expect(returnedTimeline.status).toBe(TimelineStatus.draft);
    });
  });
});
