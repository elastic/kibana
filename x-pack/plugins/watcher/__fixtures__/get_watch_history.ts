/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment, { Moment } from 'moment';
import { ACTION_STATES, WATCH_STATES } from '../common/constants';
import { ClientWatchStatusModel, ClientActionStatusModel } from '../common/types';

interface WatchHistory {
  id: string;
  watchId: string;
  startTime: Moment;
  watchStatus: {
    state: ClientWatchStatusModel['state'];
    comment?: string;
    lastExecution: Moment;
    actionStatuses?: Array<{
      id: string;
      state: ClientActionStatusModel['state'];
    }>;
  };
  details?: object;
}

export const getWatchHistory = ({
  id,
  startTime,
}: {
  id: string;
  startTime: string;
}): WatchHistory => ({
  id,
  startTime: moment(startTime),
  watchId: id,
  watchStatus: {
    state: WATCH_STATES.OK,
    lastExecution: moment('2019-06-03T19:44:11.088Z'),
    actionStatuses: [
      {
        id: 'a',
        state: ACTION_STATES.OK,
      },
    ],
  },
  details: {},
});
