/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import type { Action, Middleware } from 'redux';
import type { CoreStart } from '@kbn/core/public';

import type { State } from '../../../common/store/types';
import {
  endTimelineSaving,
  updateIsFavorite,
  updateTimeline,
  startTimelineSaving,
  showCallOutUnauthorizedMsg,
} from '../actions';
import type { ResponseFavoriteTimeline } from '../../../../common/api/timeline';
import { TimelineType } from '../../../../common/api/timeline';
import { persistFavorite } from '../../containers/api';
import { selectTimelineById } from '../selectors';
import * as i18n from '../../pages/translations';
import { refreshTimelines } from './helpers';

type FavoriteTimelineAction = ReturnType<typeof updateIsFavorite>;

function isFavoriteTimelineAction(action: Action): action is FavoriteTimelineAction {
  return action.type === updateIsFavorite.type;
}

export const favoriteTimelineMiddleware: (kibana: CoreStart) => Middleware<{}, State> =
  (kibana: CoreStart) => (store) => (next) => async (action: Action) => {
    // perform the action
    const ret = next(action);

    if (isFavoriteTimelineAction(action)) {
      const { id } = action.payload;
      const timeline = selectTimelineById(store.getState(), id);

      store.dispatch(startTimelineSaving({ id }));

      try {
        const result = await persistFavorite({
          timelineId: timeline.id,
          templateTimelineId: timeline.templateTimelineId,
          templateTimelineVersion: timeline.templateTimelineVersion,
          timelineType: timeline.timelineType ?? TimelineType.default,
        });

        const response: ResponseFavoriteTimeline = get('data.persistFavorite', result);

        if (response.code === 403) {
          store.dispatch(showCallOutUnauthorizedMsg());
        }

        refreshTimelines(store.getState());

        store.dispatch(
          updateTimeline({
            id,
            timeline: {
              ...timeline,
              isFavorite: response.favorite != null && response.favorite.length > 0,
              savedObjectId: response.savedObjectId || null,
              version: response.version || null,
            },
          })
        );
      } catch (error) {
        kibana.notifications.toasts.addDanger({
          title: i18n.UPDATE_TIMELINE_ERROR_TITLE,
          text: error?.message ?? i18n.UPDATE_TIMELINE_ERROR_TEXT,
        });
      } finally {
        store.dispatch(
          endTimelineSaving({
            id,
          })
        );
      }
    }

    return ret;
  };
