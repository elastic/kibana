/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  LOCAL_STORAGE_TIMELINE_KEY,
  useTimelinesStorage,
  getTimelinesInStorageByIds,
  getAllTimelinesInStorage,
  addTimelineInStorage,
} from '.';

import { TimelineId } from '../../../../common/types/timeline';
import { mockTimelineModel, createSecuritySolutionStorageMock } from '../../../common/mock';
import { useKibana } from '../../../common/lib/kibana';

jest.mock('../../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('SiemLocalStorage', () => {
  const { localStorage, storage } = createSecuritySolutionStorageMock();

  beforeEach(() => {
    useKibanaMock().services.storage = storage;
    localStorage.clear();
  });

  describe('addTimeline', () => {
    it('adds a timeline when storage is empty', () => {
      const timelineStorage = useTimelinesStorage();
      timelineStorage.addTimeline(TimelineId.hostsPageEvents, mockTimelineModel);
      expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TIMELINE_KEY))).toEqual({
        [TimelineId.hostsPageEvents]: mockTimelineModel,
      });
    });

    it('adds a timeline when storage contains another timelines', () => {
      const timelineStorage = useTimelinesStorage();
      timelineStorage.addTimeline(TimelineId.hostsPageEvents, mockTimelineModel);
      timelineStorage.addTimeline(TimelineId.hostsPageExternalAlerts, mockTimelineModel);
      expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TIMELINE_KEY))).toEqual({
        [TimelineId.hostsPageEvents]: mockTimelineModel,
        [TimelineId.hostsPageExternalAlerts]: mockTimelineModel,
      });
    });
  });

  describe('getAllTimelines', () => {
    it('gets all timelines correctly', () => {
      const timelineStorage = useTimelinesStorage();
      timelineStorage.addTimeline(TimelineId.hostsPageEvents, mockTimelineModel);
      timelineStorage.addTimeline(TimelineId.hostsPageExternalAlerts, mockTimelineModel);
      const timelines = timelineStorage.getAllTimelines();
      expect(timelines).toEqual({
        [TimelineId.hostsPageEvents]: mockTimelineModel,
        [TimelineId.hostsPageExternalAlerts]: mockTimelineModel,
      });
    });

    it('returns an empty object if there is no timelines', () => {
      const timelineStorage = useTimelinesStorage();
      const timelines = timelineStorage.getAllTimelines();
      expect(timelines).toEqual({});
    });
  });

  describe('getTimelineById', () => {
    it('gets a timeline by id', () => {
      const timelineStorage = useTimelinesStorage();
      timelineStorage.addTimeline(TimelineId.hostsPageEvents, mockTimelineModel);
      const timeline = timelineStorage.getTimelineById(TimelineId.hostsPageEvents);
      expect(timeline).toEqual(mockTimelineModel);
    });
  });

  describe('getTimelinesInStorageByIds', () => {
    it('gets timelines correctly', () => {
      const timelineStorage = useTimelinesStorage();
      timelineStorage.addTimeline(TimelineId.hostsPageEvents, mockTimelineModel);
      timelineStorage.addTimeline(TimelineId.hostsPageExternalAlerts, mockTimelineModel);
      const timelines = getTimelinesInStorageByIds(storage, [
        TimelineId.hostsPageEvents,
        TimelineId.hostsPageExternalAlerts,
      ]);
      expect(timelines).toEqual({
        [TimelineId.hostsPageEvents]: mockTimelineModel,
        [TimelineId.hostsPageExternalAlerts]: mockTimelineModel,
      });
    });

    it('gets an empty timelime when there is no timelines', () => {
      const timelines = getTimelinesInStorageByIds(storage, [TimelineId.hostsPageEvents]);
      expect(timelines).toEqual({});
    });

    it('returns empty timelime when there is no ids', () => {
      const timelineStorage = useTimelinesStorage();
      timelineStorage.addTimeline(TimelineId.hostsPageEvents, mockTimelineModel);
      const timelines = getTimelinesInStorageByIds(storage, []);
      expect(timelines).toEqual({});
    });

    it('returns empty timelime when a specific timeline does not exists', () => {
      const timelineStorage = useTimelinesStorage();
      timelineStorage.addTimeline(TimelineId.hostsPageEvents, mockTimelineModel);
      const timelines = getTimelinesInStorageByIds(storage, [TimelineId.hostsPageExternalAlerts]);
      expect(timelines).toEqual({});
    });

    it('returns timelines correctly when one exist and another not', () => {
      const timelineStorage = useTimelinesStorage();
      timelineStorage.addTimeline(TimelineId.hostsPageEvents, mockTimelineModel);
      const timelines = getTimelinesInStorageByIds(storage, [
        TimelineId.hostsPageEvents,
        TimelineId.hostsPageExternalAlerts,
      ]);
      expect(timelines).toEqual({
        [TimelineId.hostsPageEvents]: mockTimelineModel,
      });
    });
  });

  describe('getAllTimelinesInStorage', () => {
    it('gets timelines correctly', () => {
      const timelineStorage = useTimelinesStorage();
      timelineStorage.addTimeline(TimelineId.hostsPageEvents, mockTimelineModel);
      timelineStorage.addTimeline(TimelineId.hostsPageExternalAlerts, mockTimelineModel);
      const timelines = getAllTimelinesInStorage(storage);
      expect(timelines).toEqual({
        [TimelineId.hostsPageEvents]: mockTimelineModel,
        [TimelineId.hostsPageExternalAlerts]: mockTimelineModel,
      });
    });

    it('gets an empty timeline when there is no timelines', () => {
      const timelines = getAllTimelinesInStorage(storage);
      expect(timelines).toEqual({});
    });
  });

  describe('addTimelineInStorage', () => {
    it('adds a timeline when storage is empty', () => {
      addTimelineInStorage(storage, TimelineId.hostsPageEvents, mockTimelineModel);
      expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TIMELINE_KEY))).toEqual({
        [TimelineId.hostsPageEvents]: mockTimelineModel,
      });
    });

    it('adds a timeline when storage contains another timelines', () => {
      addTimelineInStorage(storage, TimelineId.hostsPageEvents, mockTimelineModel);
      addTimelineInStorage(storage, TimelineId.hostsPageExternalAlerts, mockTimelineModel);
      expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TIMELINE_KEY))).toEqual({
        [TimelineId.hostsPageEvents]: mockTimelineModel,
        [TimelineId.hostsPageExternalAlerts]: mockTimelineModel,
      });
    });
  });
});
