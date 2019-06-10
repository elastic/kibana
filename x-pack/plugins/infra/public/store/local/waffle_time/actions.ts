/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

const actionCreator = actionCreatorFactory('x-pack/infra/local/waffle_time');

export const jumpToTime = actionCreator<number>('JUMP_TO_TIME');

export const startAutoReload = actionCreator('START_AUTO_RELOAD');

export const stopAutoReload = actionCreator('STOP_AUTO_RELOAD');
