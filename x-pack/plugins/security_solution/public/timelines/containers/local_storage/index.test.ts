/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash/fp';
import {
  LOCAL_STORAGE_TIMELINE_KEY,
  migrateColumnWidthToInitialWidth,
  migrateColumnLabelToDisplayAsText,
  useTimelinesStorage,
  getTimelinesInStorageByIds,
  getAllTimelinesInStorage,
  addTimelineInStorage,
} from '.';

import { TimelineId } from '../../../../common/types/timeline';
import { mockTimelineModel, createSecuritySolutionStorageMock } from '../../../common/mock';
import { useKibana } from '../../../common/lib/kibana';
import { TimelineModel } from '../../store/timeline/model';

jest.mock('../../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

const getExpectedColumns = (model: TimelineModel) =>
  model.columns.map(migrateColumnWidthToInitialWidth).map(migrateColumnLabelToDisplayAsText);

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

    it('migrates columns saved to localstorage with a `width` to `initialWidth`', () => {
      const timelineStorage = useTimelinesStorage();

      // create a mock that mimics a column saved to localstoarge in the "old" format, with `width` instead of `initialWidth`
      const unmigratedMockTimelineModel = {
        ...cloneDeep(mockTimelineModel),
        columns: mockTimelineModel.columns.map((c) => ({
          ...c,
          width: 98765, // create a legacy `width` column
          initialWidth: undefined, // `initialWidth` must be undefined, otherwise the migration will not occur
        })),
      };
      timelineStorage.addTimeline(TimelineId.hostsPageEvents, unmigratedMockTimelineModel);
      timelineStorage.addTimeline(TimelineId.hostsPageExternalAlerts, mockTimelineModel);
      const timelines = getTimelinesInStorageByIds(storage, [
        TimelineId.hostsPageEvents,
        TimelineId.hostsPageExternalAlerts,
      ]);

      // all legacy `width` values are migrated to `initialWidth`:
      expect(timelines).toStrictEqual({
        [TimelineId.hostsPageEvents]: {
          ...mockTimelineModel,
          columns: mockTimelineModel.columns.map((c) => ({
            ...c,
            displayAsText: undefined,
            initialWidth: 98765,
            width: 98765,
          })),
        },
        [TimelineId.hostsPageExternalAlerts]: {
          ...mockTimelineModel,
          columns: getExpectedColumns(mockTimelineModel),
        },
      });
    });

    it('does NOT migrate columns saved to localstorage with a `width` to `initialWidth` when `initialWidth` is valid', () => {
      const timelineStorage = useTimelinesStorage();

      // create a mock that mimics a column saved to localstoarge in the "old" format, with `width` instead of `initialWidth`
      const unmigratedMockTimelineModel = {
        ...cloneDeep(mockTimelineModel),
        columns: mockTimelineModel.columns.map((c) => ({
          ...c,
          width: 98765, // create a legacy `width` column
        })),
      };
      timelineStorage.addTimeline(TimelineId.hostsPageEvents, unmigratedMockTimelineModel);
      timelineStorage.addTimeline(TimelineId.hostsPageExternalAlerts, mockTimelineModel);
      const timelines = getTimelinesInStorageByIds(storage, [
        TimelineId.hostsPageEvents,
        TimelineId.hostsPageExternalAlerts,
      ]);

      expect(timelines).toStrictEqual({
        [TimelineId.hostsPageEvents]: {
          ...mockTimelineModel,
          columns: mockTimelineModel.columns.map((c) => ({
            ...c,
            displayAsText: undefined,
            initialWidth: c.initialWidth, // initialWidth is unchanged
            width: 98765,
          })),
        },
        [TimelineId.hostsPageExternalAlerts]: {
          ...mockTimelineModel,
          columns: getExpectedColumns(mockTimelineModel),
        },
      });
    });

    it('migrates columns saved to localstorage with a `label` to `displayAsText`', () => {
      const timelineStorage = useTimelinesStorage();

      // create a mock that mimics a column saved to localstoarge in the "old" format, with `label` instead of `displayAsText`
      const unmigratedMockTimelineModel = {
        ...cloneDeep(mockTimelineModel),
        columns: mockTimelineModel.columns.map((c, i) => ({
          ...c,
          label: `A legacy label ${i}`, // create a legacy `label` column
        })),
      };
      timelineStorage.addTimeline(TimelineId.hostsPageEvents, unmigratedMockTimelineModel);
      timelineStorage.addTimeline(TimelineId.hostsPageExternalAlerts, mockTimelineModel);
      const timelines = getTimelinesInStorageByIds(storage, [
        TimelineId.hostsPageEvents,
        TimelineId.hostsPageExternalAlerts,
      ]);

      // all legacy `label` values are migrated to `displayAsText`:
      expect(timelines).toStrictEqual({
        [TimelineId.hostsPageEvents]: {
          ...mockTimelineModel,
          columns: mockTimelineModel.columns.map((c, i) => ({
            ...c,
            displayAsText: `A legacy label ${i}`,
            label: `A legacy label ${i}`,
          })),
        },
        [TimelineId.hostsPageExternalAlerts]: {
          ...mockTimelineModel,
          columns: getExpectedColumns(mockTimelineModel),
        },
      });
    });

    it('does NOT migrate columns saved to localstorage with a `label` to `displayAsText` when `displayAsText` is valid', () => {
      const timelineStorage = useTimelinesStorage();

      // create a mock that mimics a column saved to localstoarge in the "old" format, with `label` instead of `displayAsText`
      const unmigratedMockTimelineModel = {
        ...cloneDeep(mockTimelineModel),
        columns: mockTimelineModel.columns.map((c, i) => ({
          ...c,
          displayAsText:
            'Label will NOT be migrated to displayAsText, because displayAsText already has a value',
          label: `A legacy label ${i}`, // create a legacy `label` column
        })),
      };
      timelineStorage.addTimeline(TimelineId.hostsPageEvents, unmigratedMockTimelineModel);
      timelineStorage.addTimeline(TimelineId.hostsPageExternalAlerts, mockTimelineModel);
      const timelines = getTimelinesInStorageByIds(storage, [
        TimelineId.hostsPageEvents,
        TimelineId.hostsPageExternalAlerts,
      ]);

      expect(timelines).toStrictEqual({
        [TimelineId.hostsPageEvents]: {
          ...mockTimelineModel,
          columns: mockTimelineModel.columns.map((c, i) => ({
            ...c,
            displayAsText:
              'Label will NOT be migrated to displayAsText, because displayAsText already has a value',
            label: `A legacy label ${i}`,
          })),
        },
        [TimelineId.hostsPageExternalAlerts]: {
          ...mockTimelineModel,
          columns: getExpectedColumns(mockTimelineModel),
        },
      });
    });

    it('does NOT migrate `columns` when `columns` is not an array', () => {
      const timelineStorage = useTimelinesStorage();

      const invalidColumnsMockTimelineModel = {
        ...cloneDeep(mockTimelineModel),
        columns: 'this is NOT an array',
      };
      timelineStorage.addTimeline(
        TimelineId.hostsPageEvents,
        (invalidColumnsMockTimelineModel as unknown) as TimelineModel
      );
      timelineStorage.addTimeline(TimelineId.hostsPageExternalAlerts, mockTimelineModel);
      const timelines = getTimelinesInStorageByIds(storage, [
        TimelineId.hostsPageEvents,
        TimelineId.hostsPageExternalAlerts,
      ]);

      expect(timelines).toStrictEqual({
        [TimelineId.hostsPageEvents]: {
          ...mockTimelineModel,
          columns: 'this is NOT an array',
        },
        [TimelineId.hostsPageExternalAlerts]: {
          ...mockTimelineModel,
          columns: getExpectedColumns(mockTimelineModel),
        },
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

  describe('migrateColumnWidthToInitialWidth', () => {
    it('migrates the `width` property to `initialWidth` for older columns saved to localstorage', () => {
      const column = {
        ...cloneDeep(mockTimelineModel.columns[0]),
        width: 1234, // the column `width` was saved to localstorage before the `initialWidth` property existed
        initialWidth: undefined, // `initialWidth` did not exist when this column was saved to localstorage
      };

      expect(migrateColumnWidthToInitialWidth(column)).toStrictEqual({
        columnHeaderType: 'not-filtered',
        id: '@timestamp',
        initialWidth: 1234, // migrated from `width`
        width: 1234,
      });
    });

    it("leaves `initialWidth` unchanged when the column read from localstorage doesn't have a `width`", () => {
      const column = cloneDeep(mockTimelineModel.columns[0]); // `column.width` does not exist

      expect(migrateColumnWidthToInitialWidth(column)).toStrictEqual({
        columnHeaderType: 'not-filtered',
        id: '@timestamp',
        initialWidth: 190, // unchanged, because there is no `width` to migrate
      });
    });

    it('does NOT migrate the `width` property to `initialWidth` when the column read from localstorage already has a valid `initialWidth`', () => {
      const column = {
        ...cloneDeep(mockTimelineModel.columns[0]), // `column.initialWidth` already exists
        width: 1234,
      };

      expect(migrateColumnWidthToInitialWidth(column)).toStrictEqual({
        columnHeaderType: 'not-filtered',
        id: '@timestamp',
        initialWidth: 190, // unchanged, because the column read from localstorge already has a valid `initialWidth`
        width: 1234,
      });
    });
  });

  describe('migrateColumnLabelToDisplayAsText', () => {
    it('migrates the `label` property to `displayAsText` for older columns saved to localstorage', () => {
      const column = {
        ...cloneDeep(mockTimelineModel.columns[0]),
        label: 'A legacy label', // the column `label` was saved to localstorage before the `displayAsText` property existed
      };

      expect(migrateColumnLabelToDisplayAsText(column)).toStrictEqual({
        columnHeaderType: 'not-filtered',
        displayAsText: 'A legacy label', // migrated from `label`
        id: '@timestamp',
        initialWidth: 190,
        label: 'A legacy label',
      });
    });

    it("leaves `displayAsText` undefined when the column read from localstorage doesn't have a `label`", () => {
      const column = cloneDeep(mockTimelineModel.columns[0]); // `column.label` does not exist

      expect(migrateColumnLabelToDisplayAsText(column)).toStrictEqual({
        columnHeaderType: 'not-filtered',
        displayAsText: undefined, // undefined, because there is no `label` to migrate
        id: '@timestamp',
        initialWidth: 190,
      });
    });

    it("leaves `displayAsText` unchanged when the column read from localstorage doesn't have a `label`", () => {
      const column = {
        ...cloneDeep(mockTimelineModel.columns[0]),
        displayAsText: 'Do NOT update this',
      };

      expect(migrateColumnLabelToDisplayAsText(column)).toStrictEqual({
        columnHeaderType: 'not-filtered',
        displayAsText: 'Do NOT update this', // unchanged, because there is no `label` to migrate
        id: '@timestamp',
        initialWidth: 190,
      });
    });

    it('does NOT migrate the `label` property to `displayAsText` when the column read from localstorage already has a valid `displayAsText`', () => {
      const column = {
        ...cloneDeep(mockTimelineModel.columns[0]),
        displayAsText: 'Already valid',
        label: 'A legacy label',
      };

      expect(migrateColumnLabelToDisplayAsText(column)).toStrictEqual({
        columnHeaderType: 'not-filtered',
        displayAsText: 'Already valid', // unchanged, because the column read from localstorge already has a valid `displayAsText`
        label: 'A legacy label',
        id: '@timestamp',
        initialWidth: 190,
      });
    });
  });
});
