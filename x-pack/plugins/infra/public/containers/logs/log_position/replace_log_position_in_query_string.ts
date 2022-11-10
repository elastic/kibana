/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceStateKeyInQueryString } from '../../../utils/url_state';
import { LogPositionUrlState, LOG_POSITION_URL_STATE_KEY } from './use_log_position_url_state_sync';

const ONE_HOUR = 3600000;

export const replaceLogPositionInQueryString = (time: number) =>
  Number.isNaN(time)
    ? (value: string) => value
    : replaceStateKeyInQueryString<LogPositionUrlState>(LOG_POSITION_URL_STATE_KEY, {
        position: {
          time,
          tiebreaker: 0,
        },
        end: new Date(time + ONE_HOUR).toISOString(),
        start: new Date(time - ONE_HOUR).toISOString(),
        streamLive: false,
      });
