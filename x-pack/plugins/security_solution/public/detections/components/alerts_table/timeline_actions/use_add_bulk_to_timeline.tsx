/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineItem } from '@kbn/timelines-plugin/common';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { dispatchUpdateTimeline } from '../../../../timelines/components/open_timeline/helpers';
import { timelineActions } from '../../../../timelines/store/timeline';
import { useCreateTimeline } from '../../../../timelines/components/timeline/properties/use_create_timeline';
import { ADD_BULK_TO_TIMELINE } from '../translations';
import { TimelineId, TimelineType } from '../../../../../common/types/timeline';
import { sendBulkEventsToTimelineAction } from '../actions';
import type { CreateTimelineProps } from '../types';

export const useAddBulkToTimelineAction = () => {
  const dispatch = useDispatch();
  const clearActiveTimeline = useCreateTimeline({
    timelineId: TimelineId.active,
    timelineType: TimelineType.default,
  });

  const updateTimelineIsLoading = useCallback(
    (payload) => dispatch(timelineActions.updateIsLoading(payload)),
    [dispatch]
  );

  const createTimeline = useCallback(
    ({ from: fromTimeline, timeline, to: toTimeline, ruleNote }: CreateTimelineProps) => {
      clearActiveTimeline();
      updateTimelineIsLoading({ id: TimelineId.active, isLoading: false });
      dispatchUpdateTimeline(dispatch)({
        duplicate: true,
        from: fromTimeline,
        id: TimelineId.active,
        notes: [],
        timeline: {
          ...timeline,
          indexNames: timeline.indexNames ?? [],
          show: true,
        },
        to: toTimeline,
        ruleNote,
      })();
    },
    [dispatch, updateTimelineIsLoading, clearActiveTimeline]
  );

  const onActionClick = useCallback(
    (items: TimelineItem[] | undefined) => {
      if (!items) return;
      sendBulkEventsToTimelineAction(
        createTimeline,
        items.map((item) => item.ecs)
      );
    },
    [createTimeline]
  );

  return {
    label: ADD_BULK_TO_TIMELINE,
    key: 'add-bulk-to-timeline',
    'data-test-subj': 'add-bulk-to-timeline',
    disableOnQuery: true,
    onClick: onActionClick,
  };
};
