/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineEpics } from 'redux-observable';

import {
  createTimelineEpic,
  createTimelineFavoriteEpic,
  createTimelineNoteEpic,
  createTimelinePinnedEventEpic,
} from './timeline';

export const createRootEpic = <State>() =>
  combineEpics(
    createTimelineEpic<State>(),
    createTimelineFavoriteEpic<State>(),
    createTimelineNoteEpic<State>(),
    createTimelinePinnedEventEpic<State>()
  );
