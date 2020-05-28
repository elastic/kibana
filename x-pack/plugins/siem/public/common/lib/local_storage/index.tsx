/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Storage } from '../../../../../../../src/plugins/kibana_utils/public';
import { SiemStorage } from './types';

const LOCAL_STORAGE_TIMELINE_KEY = 'timelines';

export const createSiemLocalStorage = (): SiemStorage => {
  const storage = new Storage(localStorage);

  const getAllTimelines: SiemStorage['getAllTimelines'] = () => {
    return storage.get(LOCAL_STORAGE_TIMELINE_KEY);
  };

  const addTimeline: SiemStorage['addTimeline'] = (id, timeline) => {
    const timelines = getAllTimelines() ?? {};
    storage.set(LOCAL_STORAGE_TIMELINE_KEY, {
      ...timelines,
      [id]: timeline,
    });
  };

  return { getAllTimelines, addTimeline };
};

export { SiemStorage };
