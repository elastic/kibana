/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Storage, IStorage } from '../../../../../../../src/plugins/kibana_utils/public';
import { SecuritySolutionStorage } from './types';

export const LOCAL_STORAGE_TIMELINE_KEY = 'timelines';

export const createSecuritySolutionStorage = (store: IStorage): SecuritySolutionStorage => {
  const storage = new Storage(store);

  const getAllTimelines: SecuritySolutionStorage['getAllTimelines'] = () => {
    return storage.get(LOCAL_STORAGE_TIMELINE_KEY);
  };

  const addTimeline: SecuritySolutionStorage['addTimeline'] = (id, timeline) => {
    const timelines = getAllTimelines() ?? {};
    storage.set(LOCAL_STORAGE_TIMELINE_KEY, {
      ...timelines,
      [id]: timeline,
    });
  };

  return { getAllTimelines, addTimeline };
};

export { SecuritySolutionStorage };
