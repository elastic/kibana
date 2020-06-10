/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LOCAL_STORAGE_TIMELINE_KEY, useTimelinesStorage } from '.';
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

  it('returns null if there is no timelines', () => {
    const timelineStorage = useTimelinesStorage();
    const timelines = timelineStorage.getAllTimelines();
    expect(timelines).toEqual(null);
  });

  it('gets a timeline by id', () => {
    const timelineStorage = useTimelinesStorage();
    timelineStorage.addTimeline('hosts-page-events', mockTimelineModel);
    const timeline = timelineStorage.getTimelineById('hosts-page-events');
    expect(timeline).toEqual(mockTimelineModel);
  });
});
