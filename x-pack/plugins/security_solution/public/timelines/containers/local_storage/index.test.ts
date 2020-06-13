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
import { mockTimelineModel, createSecuritySolutionStorageMock } from '../../../common/mock';
import { useKibana } from '../../../common/lib/kibana';
import { createUseKibanaMock } from '../../../common/mock/kibana_react';

jest.mock('../../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mock;

describe('SiemLocalStorage', () => {
  const { localStorage, storage } = createSecuritySolutionStorageMock();

  beforeEach(() => {
    jest.resetAllMocks();
    useKibanaMock.mockImplementation(() => ({
      services: {
        ...createUseKibanaMock()().services,
        storage,
      },
    }));
    localStorage.clear();
  });

  describe('addTimeline', () => {
    it('adds a timeline when storage is empty', () => {
      const timelineStorage = useTimelinesStorage();
      timelineStorage.addTimeline('hosts-page-events', mockTimelineModel);
      expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TIMELINE_KEY))).toEqual({
        'hosts-page-events': mockTimelineModel,
      });
    });

    it('adds a timeline when storage contains another timelines', () => {
      const timelineStorage = useTimelinesStorage();
      timelineStorage.addTimeline('hosts-page-events', mockTimelineModel);
      timelineStorage.addTimeline('hosts-page-external-alerts', mockTimelineModel);
      expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TIMELINE_KEY))).toEqual({
        'hosts-page-events': mockTimelineModel,
        'hosts-page-external-alerts': mockTimelineModel,
      });
    });
  });

  describe('getAllTimelines', () => {
    it('gets all timelines correctly', () => {
      const timelineStorage = useTimelinesStorage();
      timelineStorage.addTimeline('hosts-page-events', mockTimelineModel);
      timelineStorage.addTimeline('hosts-page-external-alerts', mockTimelineModel);
      const timelines = timelineStorage.getAllTimelines();
      expect(timelines).toEqual({
        'hosts-page-events': mockTimelineModel,
        'hosts-page-external-alerts': mockTimelineModel,
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
      timelineStorage.addTimeline('hosts-page-events', mockTimelineModel);
      const timeline = timelineStorage.getTimelineById('hosts-page-events');
      expect(timeline).toEqual(mockTimelineModel);
    });
  });

  describe('getTimelinesInStorageByIds', () => {
    it('gets timelines correctly', () => {
      const timelineStorage = useTimelinesStorage();
      timelineStorage.addTimeline('hosts-page-events', mockTimelineModel);
      timelineStorage.addTimeline('hosts-page-external-alerts', mockTimelineModel);
      const timelines = getTimelinesInStorageByIds(storage, [
        'hosts-page-events',
        'hosts-page-external-alerts',
      ]);
      expect(timelines).toEqual({
        'hosts-page-events': mockTimelineModel,
        'hosts-page-external-alerts': mockTimelineModel,
      });
    });

    it('gets an empty timelime when there is no timelines', () => {
      const timelines = getTimelinesInStorageByIds(storage, ['hosts-page-events']);
      expect(timelines).toEqual({});
    });

    it('returns empty timelime when there is no ids', () => {
      const timelineStorage = useTimelinesStorage();
      timelineStorage.addTimeline('hosts-page-events', mockTimelineModel);
      const timelines = getTimelinesInStorageByIds(storage, []);
      expect(timelines).toEqual({});
    });

    it('returns empty timelime when a specific timeline does not exists', () => {
      const timelineStorage = useTimelinesStorage();
      timelineStorage.addTimeline('hosts-page-events', mockTimelineModel);
      const timelines = getTimelinesInStorageByIds(storage, ['hosts-page-external-alerts']);
      expect(timelines).toEqual({});
    });

    it('returns timelines correctly when one exist and another not', () => {
      const timelineStorage = useTimelinesStorage();
      timelineStorage.addTimeline('hosts-page-events', mockTimelineModel);
      const timelines = getTimelinesInStorageByIds(storage, [
        'hosts-page-events',
        'hosts-page-external-alerts',
      ]);
      expect(timelines).toEqual({
        'hosts-page-events': mockTimelineModel,
      });
    });
  });

  describe('getAllTimelinesInStorage', () => {
    it('gets timelines correctly', () => {
      const timelineStorage = useTimelinesStorage();
      timelineStorage.addTimeline('hosts-page-events', mockTimelineModel);
      timelineStorage.addTimeline('hosts-page-external-alerts', mockTimelineModel);
      const timelines = getAllTimelinesInStorage(storage);
      expect(timelines).toEqual({
        'hosts-page-events': mockTimelineModel,
        'hosts-page-external-alerts': mockTimelineModel,
      });
    });

    it('gets an empty timeline when there is no timelines', () => {
      const timelines = getAllTimelinesInStorage(storage);
      expect(timelines).toEqual({});
    });
  });

  describe('addTimelineInStorage', () => {
    it('adds a timeline when storage is empty', () => {
      addTimelineInStorage(storage, 'hosts-page-events', mockTimelineModel);
      expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TIMELINE_KEY))).toEqual({
        'hosts-page-events': mockTimelineModel,
      });
    });

    it('adds a timeline when storage contains another timelines', () => {
      addTimelineInStorage(storage, 'hosts-page-events', mockTimelineModel);
      addTimelineInStorage(storage, 'hosts-page-external-alerts', mockTimelineModel);
      expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TIMELINE_KEY))).toEqual({
        'hosts-page-events': mockTimelineModel,
        'hosts-page-external-alerts': mockTimelineModel,
      });
    });
  });
});
