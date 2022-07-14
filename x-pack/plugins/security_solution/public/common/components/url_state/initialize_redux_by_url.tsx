/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type { TimelineUrl } from '../../../timelines/store/timeline/model';
import { CONSTANTS } from './constants';
import { decodeRisonUrlState } from './helpers';
import type { SetInitialStateFromUrl } from './types';
import {
  queryTimelineById,
  dispatchUpdateTimeline,
} from '../../../timelines/components/open_timeline/helpers';
import { timelineActions } from '../../../timelines/store/timeline';

export const useSetInitialStateFromUrl = () => {
  const dispatch = useDispatch();
  const updateTimeline = useMemo(() => dispatchUpdateTimeline(dispatch), [dispatch]);

  const updateTimelineIsLoading = useMemo(
    () => (status: { id: string; isLoading: boolean }) =>
      dispatch(timelineActions.updateIsLoading(status)),
    [dispatch]
  );

  const setInitialStateFromUrl = useCallback(
    ({ urlStateToUpdate }: SetInitialStateFromUrl) => {
      urlStateToUpdate.forEach(({ urlKey, newUrlStateString }) => {
        if (urlKey === CONSTANTS.timeline) {
          const timeline = decodeRisonUrlState<TimelineUrl>(newUrlStateString);
          if (timeline != null && timeline.id !== '') {
            queryTimelineById({
              activeTimelineTab: timeline.activeTab,
              duplicate: false,
              graphEventId: timeline.graphEventId,
              timelineId: timeline.id,
              openTimeline: timeline.isOpen,
              updateIsLoading: updateTimelineIsLoading,
              updateTimeline,
            });
          }
        }
      });
    },
    [updateTimeline, updateTimelineIsLoading]
  );

  return Object.freeze({ setInitialStateFromUrl, updateTimeline, updateTimelineIsLoading });
};
