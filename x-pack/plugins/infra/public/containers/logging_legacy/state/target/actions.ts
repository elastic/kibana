/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { LogEntryTime } from '../../../../../common/log_entry';

const actionCreator = actionCreatorFactory('kibana/logging/target');

export const jumpToTarget = actionCreator<LogEntryTime>('JUMP_TO_TARGET');

export const jumpToTime = (time: number) =>
  jumpToTarget({
    tiebreaker: 0,
    time,
  });
