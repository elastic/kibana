/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Action } from 'redux';
import { Observable } from 'rxjs';

import { Storage } from '../../../../../../../src/plugins/kibana_utils/public';
import { AppApolloClient } from '../../../common/lib/lib';
import { inputsModel } from '../../../common/store/inputs';
import { NotesById } from '../../../common/store/app/model';

import { TimelineModel } from './model';
import { CoreStart } from '../../../../../../../src/core/public';

export interface AutoSavedWarningMsg {
  timelineId: string | null;
  newTimelineModel: TimelineModel | null;
}

/** A map of id to timeline  */
export interface TimelineById {
  [id: string]: TimelineModel;
}

export interface InsertTimeline {
  graphEventId?: string;
  timelineId: string;
  timelineSavedObjectId: string | null;
  timelineTitle: string;
}

export const EMPTY_TIMELINE_BY_ID: TimelineById = {}; // stable reference

/** The state of all timelines is stored here */
export interface TimelineState {
  timelineById: TimelineById;
  autoSavedWarningMsg: AutoSavedWarningMsg;
  showCallOutUnauthorizedMsg: boolean;
  insertTimeline: InsertTimeline | null;
}

export interface ActionTimeline extends Action<string> {
  payload: {
    id: string;
    eventId: string;
    noteId: string;
  };
}

export interface TimelineEpicDependencies<State> {
  timelineByIdSelector: (state: State) => TimelineById;
  timelineTimeRangeSelector: (state: State) => inputsModel.TimeRange;
  selectAllTimelineQuery: () => (state: State, id: string) => inputsModel.GlobalQuery;
  selectNotesByIdSelector: (state: State) => NotesById;
  apolloClient$: Observable<AppApolloClient>;
  kibana$: Observable<CoreStart>;
  storage: Storage;
}
