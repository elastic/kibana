/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Storage } from '../../../../../../../src/plugins/kibana_utils/public';
import { TimelinesStorage } from './types';
import { useKibana } from '../../../common/lib/kibana';
import { TimelineModel } from '../../store/timeline/model';
import { TimelineIdLiteral } from '../../../../common/types/timeline';

export const LOCAL_STORAGE_TIMELINE_KEY = 'timelines';
const EMPTY_TIMELINE = {} as {
  [K in TimelineIdLiteral]: TimelineModel;
};

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
      [timelineId]: timelineModel,
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
  const timelines = getAllTimelinesInStorage(storage);
  storage.set(LOCAL_STORAGE_TIMELINE_KEY, {
    ...timelines,
    [id]: timeline,
  });
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

export { TimelinesStorage };
