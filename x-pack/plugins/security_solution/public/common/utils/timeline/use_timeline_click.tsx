/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useApolloClient } from '../../../common/utils/apollo_context';
import {
  dispatchUpdateTimeline,
  queryTimelineById,
} from '../../../timelines/components/open_timeline/helpers';
import { updateIsLoading as dispatchUpdateIsLoading } from '../../../timelines/store/timeline/actions';

export const useTimelineClick = () => {
  const dispatch = useDispatch();
  const apolloClient = useApolloClient();

  const handleTimelineClick = useCallback(
    (timelineId: string, graphEventId?: string) => {
      queryTimelineById({
        apolloClient,
        graphEventId,
        timelineId,
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
    [apolloClient, dispatch]
  );

  return handleTimelineClick;
};
