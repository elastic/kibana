/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { TimeKey } from '../../../../../common/time';

const actionCreator = actionCreatorFactory('kibana/logging/log_position');

export const jumpToTargetPosition = actionCreator<TimeKey>('JUMP_TO_TARGET_POSITION');

export const jumpToTargetPositionTime = (time: number) =>
  jumpToTargetPosition({
    tiebreaker: 0,
    time,
  });

export const startAutoReload = actionCreator<number>('START_AUTO_RELOAD');

export const stopAutoReload = actionCreator('STOP_AUTO_RELOAD');
