/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSecuritySolutionStorage, LOCAL_STORAGE_TIMELINE_KEY } from '.';
import { localStorageMock, mockTimelineModel } from '../../mock';

describe('SiemLocalStorage', () => {
  const localStorage = localStorageMock();
  const storage = createSecuritySolutionStorage(localStorage);

  beforeEach(() => {
    localStorage.clear();
  });

  it('adds a timeline when storage is empty', () => {
    storage.addTimeline('timeline-1', mockTimelineModel);
    expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TIMELINE_KEY))).toEqual({
      'timeline-1': mockTimelineModel,
    });
  });

  it('adds a timeline when storage contains another timelines', () => {
    storage.addTimeline('timeline-1', mockTimelineModel);
    storage.addTimeline('timeline-2', mockTimelineModel);
    expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TIMELINE_KEY))).toEqual({
      'timeline-1': mockTimelineModel,
      'timeline-2': mockTimelineModel,
    });
  });

  it('gets all timelines correctly', () => {
    storage.addTimeline('timeline-1', mockTimelineModel);
    storage.addTimeline('timeline-2', mockTimelineModel);
    const timelines = storage.getAllTimelines();
    expect(timelines).toEqual({
      'timeline-1': mockTimelineModel,
      'timeline-2': mockTimelineModel,
    });
  });

  it('returns an empty object if there is no timelines', () => {
    const timelines = storage.getAllTimelines();
    expect(timelines).toEqual({});
  });
});
