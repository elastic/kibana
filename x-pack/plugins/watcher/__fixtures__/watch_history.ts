/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRandomString } from '@kbn/test-jest-helpers';

interface WatchHistory {
  startTime: string;
  id: string;
  watchId: string;
  watchStatus: {
    state: 'OK' | 'Firing' | 'Error' | 'Config error' | 'Disabled';
    comment?: string;
    actionStatuses?: Array<{
      id: string;
      state: 'OK' | 'Firing' | 'Error' | 'Acked' | 'Throttled' | 'Config error';
    }>;
  };
  details?: object;
}

export const getWatchHistory = ({
  startTime = '2019-06-03T19:44:11.088Z',
  id = getRandomString(),
  watchId = getRandomString(),
  watchStatus = {
    state: 'OK',
  },
  details = {},
}: Partial<WatchHistory> = {}): WatchHistory => ({
  startTime,
  id,
  watchId,
  watchStatus,
  details,
});
