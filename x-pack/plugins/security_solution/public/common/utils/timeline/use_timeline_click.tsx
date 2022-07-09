/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  dispatchUpdateTimeline,
  queryTimelineById,
} from '../../../timelines/components/open_timeline/helpers';
import type { TimelineErrorCallback } from '../../../timelines/components/open_timeline/types';
import { updateIsLoading as dispatchUpdateIsLoading } from '../../../timelines/store/timeline/actions';

export const useTimelineClick = () => {
  const dispatch = useDispatch();

  const handleTimelineClick = useCallback(
    (timelineId: string, onError: TimelineErrorCallback, graphEventId?: string) => {
      queryTimelineById({
        graphEventId,
        timelineId,
        onError,
        updateIsLoading: ({
          id: currentTimelineId,
          isLoading,
        }: {
          id: string;
          isLoading: boolean;
        }) => dispatch(dispatchUpdateIsLoading({ id: currentTimelineId, isLoading })),
        updateTimeline: dispatchUpdateTimeline(dispatch),
      });
    },
    [dispatch]
  );

  return handleTimelineClick;
};
