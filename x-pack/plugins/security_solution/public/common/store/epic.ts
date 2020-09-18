/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineEpics, Epic } from 'redux-observable';
import { Action } from 'redux';

import { createTimelineEpic } from '../../timelines/store/timeline/epic';
import { createTimelineFavoriteEpic } from '../../timelines/store/timeline/epic_favorite';
import { createTimelineNoteEpic } from '../../timelines/store/timeline/epic_note';
import { createTimelinePinnedEventEpic } from '../../timelines/store/timeline/epic_pinned_event';
import { createTimelineLocalStorageEpic } from '../../timelines/store/timeline/epic_local_storage';
import { TimelineEpicDependencies } from '../../timelines/store/timeline/types';

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
    createTimelineLocalStorageEpic<State>()
  );
