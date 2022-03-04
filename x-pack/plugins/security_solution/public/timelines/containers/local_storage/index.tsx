/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { Storage } from '../../../../../../../src/plugins/kibana_utils/public';
import { TimelinesStorage } from './types';
import { useKibana } from '../../../common/lib/kibana';
import { TimelineModel } from '../../store/timeline/model';
import { ColumnHeaderOptions, TimelineIdLiteral } from '../../../../common/types/timeline';

export const LOCAL_STORAGE_TIMELINE_KEY = 'timelines';
const EMPTY_TIMELINE = {} as {
  [K in TimelineIdLiteral]: TimelineModel;
};

/**
 * Migrates the value of the column's `width` property to `initialWidth`
 * when `width` is valid, and `initialWidth` is invalid
 */
export const migrateColumnWidthToInitialWidth = (
  column: ColumnHeaderOptions & { width?: number }
) => ({
  ...column,
  initialWidth:
    Number.isInteger(column.width) && !Number.isInteger(column.initialWidth)
      ? column.width
      : column.initialWidth,
});

/**
 * Migrates the value of the column's `label` property to `displayAsText`
 * when `label` is valid, and `displayAsText` is `undefined`
 */
export const migrateColumnLabelToDisplayAsText = (
  column: ColumnHeaderOptions & { label?: string }
) => ({
  ...column,
  displayAsText:
    !isEmpty(column.label) && column.displayAsText == null ? column.label : column.displayAsText,
});

export const getTimelinesInStorageByIds = (storage: Storage, timelineIds: TimelineIdLiteral[]) => {
  const allTimelines = storage.get(LOCAL_STORAGE_TIMELINE_KEY);

  if (!allTimelines) {
    return EMPTY_TIMELINE;
  }

  return timelineIds.reduce((acc, timelineId) => {
    const timelineModel = allTimelines[timelineId];
    if (!timelineModel) {
      return {
        ...acc,
      };
    }

    return {
      ...acc,
      [timelineId]: {
        ...timelineModel,
        ...(timelineModel.sort != null && !Array.isArray(timelineModel.sort)
          ? { sort: [timelineModel.sort] }
          : {}),
        ...(Array.isArray(timelineModel.columns)
          ? {
              columns: timelineModel.columns
                .map(migrateColumnWidthToInitialWidth)
                .map(migrateColumnLabelToDisplayAsText),
            }
          : {}),
      },
    };
  }, {} as { [K in TimelineIdLiteral]: TimelineModel });
};

export const getAllTimelinesInStorage = (storage: Storage) =>
  storage.get(LOCAL_STORAGE_TIMELINE_KEY) ?? {};

export const addTimelineInStorage = (
  storage: Storage,
  id: TimelineIdLiteral,
  timeline: TimelineModel
) => {
  const timelineToStore = cleanStorageTimeline(timeline);
  const timelines = getAllTimelinesInStorage(storage);
  storage.set(LOCAL_STORAGE_TIMELINE_KEY, {
    ...timelines,
    [id]: timelineToStore,
  });
};

const cleanStorageTimeline = (timeline: TimelineModel) => {
  // discard unneeded fields to make sure the object serialization works
  const {
    documentType,
    filterManager,
    isLoading,
    loadingText,
    queryFields,
    selectAll,
    unit,
    ...timelineToStore
  } = timeline;
  return timelineToStore;
};

export const useTimelinesStorage = (): TimelinesStorage => {
  const { storage } = useKibana().services;

  const getAllTimelines: TimelinesStorage['getAllTimelines'] = () =>
    getAllTimelinesInStorage(storage);

  const getTimelineById: TimelinesStorage['getTimelineById'] = (id: TimelineIdLiteral) =>
    getTimelinesInStorageByIds(storage, [id])[id] ?? null;

  const addTimeline: TimelinesStorage['addTimeline'] = (id, timeline) =>
    addTimelineInStorage(storage, id, timeline);

  return { getAllTimelines, getTimelineById, addTimeline };
};

export type { TimelinesStorage };
