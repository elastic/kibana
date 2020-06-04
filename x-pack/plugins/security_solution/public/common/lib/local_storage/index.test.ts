/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSiemLocalStorage, LOCAL_STORAGE_TIMELINE_KEY } from '.';
import { localStorageMock } from '../../mock';

describe('SiemLocalStorage', () => {
  const localStorage = localStorageMock();
  const storage = createSiemLocalStorage(localStorage);

  beforeEach(() => {
    localStorage.clear();
  });

  it('adds a timeline when storage is empty', () => {
    storage.addTimeline('timeline-1', {});
    expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TIMELINE_KEY))).toEqual({
      'timeline-1': {},
    });
  });

  it('adds a timeline when storage contains another timelines', () => {
    storage.addTimeline('timeline-1', {});
    storage.addTimeline('timeline-2', {});
    expect(JSON.parse(localStorage.getItem(LOCAL_STORAGE_TIMELINE_KEY))).toEqual({
      'timeline-1': {},
      'timeline-2': {},
    });
  });

  it('gets all timelines correctly', () => {
    storage.addTimeline('timeline-1', {});
    storage.addTimeline('timeline-2', {});
    const timelines = storage.getAllTimelines();
    expect(timelines).toEqual({
      'timeline-1': {},
      'timeline-2': {},
    });
  });

  it('it gets null if there is no timelines', () => {
    const timelines = storage.getAllTimelines();
    expect(timelines).toBe(null);
  });
});
