/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Epic } from 'redux-observable';
import { combineEpics } from 'redux-observable';
import type { Action } from 'redux';

import { createTimelineEpic } from '../../timelines/store/timeline/epic';
import { createTimelineFavoriteEpic } from '../../timelines/store/timeline/epic_favorite';
import { createTimelineNoteEpic } from '../../timelines/store/timeline/epic_note';
import { createTimelinePinnedEventEpic } from '../../timelines/store/timeline/epic_pinned_event';
import type { TimelineEpicDependencies } from '../../timelines/store/timeline/types';
import { createDataTableLocalStorageEpic } from './data_table/epic_local_storage';

export const createRootEpic = <State>(): Epic<
  Action,
  Action,
  State,
  TimelineEpicDependencies<State>
> =>
  combineEpics(
    createTimelineEpic<State>(),
    createTimelineFavoriteEpic<State>(),
    createTimelineNoteEpic<State>(),
    createTimelinePinnedEventEpic<State>(),
    createDataTableLocalStorageEpic<State>()
  );
