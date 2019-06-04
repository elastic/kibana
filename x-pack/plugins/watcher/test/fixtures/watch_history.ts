/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface WatchHistory {
  startTime: string;
  watchStatus: {
    state: 'OK' | 'Firing' | 'Error' | 'Config error' | 'Disabled';
    comment?: string;
  };
}

export const getWatchHistory = ({
  startTime = '2019-06-03T19:44:11.088Z',
  watchStatus = {
    state: 'OK',
  },
}: Partial<WatchHistory> = {}): WatchHistory => ({
  startTime,
  watchStatus,
});
