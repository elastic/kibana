/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Epic } from 'redux-observable';
import { combineEpics } from 'redux-observable';
import type { Action } from 'redux';

import type { Observable } from 'rxjs';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { createTimelineEpic } from '../../timelines/store/timeline/epic';
import { createTimelineChangedEpic } from '../../timelines/store/timeline/epic_changed';
import { createTimelineFavoriteEpic } from '../../timelines/store/timeline/epic_favorite';
import { createTimelineNoteEpic } from '../../timelines/store/timeline/epic_note';
import { createTimelinePinnedEventEpic } from '../../timelines/store/timeline/epic_pinned_event';
import type { TimelineEpicDependencies } from '../../timelines/store/timeline/types';
import { createDataTableLocalStorageEpic } from './data_table/epic_local_storage';
import { createUserAssetTableLocalStorageEpic } from '../../explore/users/store/epic_storage';
import type { State } from './types';

export interface RootEpicDependencies {
  kibana$: Observable<CoreStart>;
  storage: Storage;
}

export const createRootEpic = <StateT extends State>(): Epic<
  Action,
  Action,
  StateT,
  TimelineEpicDependencies<StateT>
> =>
  combineEpics(
    createTimelineEpic<StateT>(),
    createTimelineChangedEpic(),
    createTimelineFavoriteEpic<StateT>(),
    createTimelineNoteEpic<StateT>(),
    createTimelinePinnedEventEpic<StateT>(),
    createDataTableLocalStorageEpic<StateT>(),
    createUserAssetTableLocalStorageEpic<StateT>()
  );
