/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Storage, IStorage } from '../../../../../../../src/plugins/kibana_utils/public';
import { SecuritySolutionStorage, TimelineId } from './types';
import { useKibana } from '../../../common/lib/kibana';

export const LOCAL_STORAGE_TIMELINE_KEY = 'timelines';

export const getTimelineInStorageById = (storage: Storage, id: TimelineId) => {
  const timelines = storage.get(LOCAL_STORAGE_TIMELINE_KEY);
  if (timelines != null) {
    return timelines[id];
  }
  return null;
};

export const useTimelinesStorage = (store: IStorage): SecuritySolutionStorage => {
  const { storage } = useKibana().services;

  const getAllTimelines: SecuritySolutionStorage['getAllTimelines'] = () =>
    storage.get(LOCAL_STORAGE_TIMELINE_KEY) ?? null;

  const getTimelineById: SecuritySolutionStorage['getTimelineById'] = (id: TimelineId) =>
    getTimelineInStorageById(storage, id);

  const addTimeline: SecuritySolutionStorage['addTimeline'] = (id, timeline) => {
    const timelines = getAllTimelines();
    storage.set(LOCAL_STORAGE_TIMELINE_KEY, {
      ...timelines,
      [id]: timeline,
    });
  };

  return { getAllTimelines, getTimelineById, addTimeline };
};

export { SecuritySolutionStorage };
