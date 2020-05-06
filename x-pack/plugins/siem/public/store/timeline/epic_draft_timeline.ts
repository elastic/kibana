/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of, Observable, from } from 'rxjs';
import { get } from 'lodash/fp';
import { filter, withLatestFrom, mergeMap, takeUntil, startWith } from 'rxjs/operators';
import { Epic } from 'redux-observable';
import { Action } from 'redux';
import {
  addTimeline,
  createTimeline,
  showCallOutUnauthorizedMsg,
  endTimelineSaving,
} from './actions';
import { getDraftTimeline, cleanDraftTimeline } from '../../containers/timeline/api';
import { ActionTimeline, TimelineById } from './types';
import { myEpicTimelineId } from './my_epic_timeline_id';
import { addError } from '../app/actions';
import {
  formatTimelineResultToModel,
  epicUpdateTimeline,
} from '../../components/open_timeline/helpers';
import { getTimeRangeSettings } from '../../utils/default_date_settings';
import { ResponseTimeline } from '../../graphql/types';
import { timelineDefaults } from './defaults';

export const epicDraftTimeline = (
  action: ActionTimeline,
  action$: Observable<Action>,
  timeline$: Observable<TimelineById>,
  clean: boolean
) =>
  from(clean ? cleanDraftTimeline() : getDraftTimeline()).pipe(
    withLatestFrom(timeline$),
    mergeMap(([result, recentTimelines]) => {
      const savedTimeline = recentTimelines[action.payload.id];
      const response: ResponseTimeline = get('data.persistTimeline', result);
      const callOutMsg = response.code === 403 ? [showCallOutUnauthorizedMsg()] : [];

      const { timeline: timelineModel, notes } = formatTimelineResultToModel(
        {
          savedObjectId: response.timeline.savedObjectId,
          version: response.timeline.version,
          timelineType: response.timeline.timelineType,
        },
        false
      );
      const { from: settingsFrom, to: settingsTo } = getTimeRangeSettings();

      return [
        ...callOutMsg,
        ...epicUpdateTimeline({
          duplicate: false,
          from: savedTimeline?.dateRange.start ?? settingsFrom,
          id: 'timeline-1',
          notes,
          timeline: {
            ...savedTimeline,
            ...timelineModel,
            ...action.payload,
            id: timelineModel.savedObjectId!,
            savedObjectId: timelineModel.savedObjectId!,
            version: timelineModel.version,
            // @ts-ignore
            show: action.payload.show ?? savedTimeline.show,
          },
          to: savedTimeline?.dateRange.end ?? settingsTo,
        }),
        endTimelineSaving({
          id: action.payload.id,
        }),
      ];
    }),
    takeUntil(
      action$.pipe(
        withLatestFrom(timeline$),
        filter(([checkAction, updatedTimeline]) => {
          if (checkAction.type === addError.type) {
            return true;
          }
          if (checkAction.type === addTimeline.type) {
            return true;
          }
          if (
            checkAction.type === endTimelineSaving.type &&
            updatedTimeline[get('payload.id', checkAction)].savedObjectId != null
          ) {
            myEpicTimelineId.setTimelineId(
              updatedTimeline[get('payload.id', checkAction)].savedObjectId
            );
            myEpicTimelineId.setTimelineVersion(
              updatedTimeline[get('payload.id', checkAction)].version
            );
            return true;
          }
          return false;
        })
      )
    )
  );

export const createDraftTimelineEpic = <State>(): Epic<Action, Action, State> => () =>
  of(createTimeline({ id: 'timeline-1', columns: timelineDefaults.columns })).pipe(
    startWith(
      addTimeline({ id: 'timeline-1', timeline: { id: 'timeline-1', ...timelineDefaults } })
    )
  );
