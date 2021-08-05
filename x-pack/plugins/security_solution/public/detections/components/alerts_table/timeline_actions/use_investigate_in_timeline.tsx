/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { useKibana } from '../../../../common/lib/kibana';

import { TimelineId } from '../../../../../common/types/timeline';
import { Ecs } from '../../../../../common/ecs';
import { TimelineNonEcsData } from '../../../../../common/search_strategy/timeline';
import { timelineActions } from '../../../../timelines/store/timeline';
import { sendAlertToTimelineAction } from '../actions';
import { dispatchUpdateTimeline } from '../../../../timelines/components/open_timeline/helpers';
import { CreateTimelineProps } from '../types';
import { ACTION_INVESTIGATE_IN_TIMELINE } from '../translations';
import { useFetchEcsAlertsData } from '../../../containers/detection_engine/alerts/use_fetch_ecs_alerts_data';

interface UseInvestigateInTimelineActionProps {
  ecsRowData?: Ecs | Ecs[] | null;
  nonEcsRowData?: TimelineNonEcsData[];
  alertIds?: string[] | null | undefined;
  onInvestigateInTimelineAlertClick?: () => void;
}

export const useInvestigateInTimeline = ({
  ecsRowData,
  nonEcsRowData,
  alertIds,
  onInvestigateInTimelineAlertClick,
}: UseInvestigateInTimelineActionProps) => {
  const {
    data: { search: searchStrategyClient },
  } = useKibana().services;
  const dispatch = useDispatch();

  const updateTimelineIsLoading = useCallback(
    (payload) => dispatch(timelineActions.updateIsLoading(payload)),
    [dispatch]
  );

  const createTimeline = useCallback(
    ({ from: fromTimeline, timeline, to: toTimeline, ruleNote }: CreateTimelineProps) => {
      updateTimelineIsLoading({ id: TimelineId.active, isLoading: false });
      dispatchUpdateTimeline(dispatch)({
        duplicate: true,
        from: fromTimeline,
        id: TimelineId.active,
        notes: [],
        timeline: {
          ...timeline,
          // by setting as an empty array, it will default to all in the reducer because of the event type
          indexNames: [],
          show: true,
        },
        to: toTimeline,
        ruleNote,
      })();
    },
    [dispatch, updateTimelineIsLoading]
  );

  const showInvestigateInTimelineAction = alertIds != null;
  const { isLoading: isFetchingAlertEcs, alertsEcsData } = useFetchEcsAlertsData({
    alertIds,
    skip: ecsRowData != null || alertIds == null,
  });

  const investigateInTimelineAlertClick = useCallback(async () => {
    if (onInvestigateInTimelineAlertClick) {
      onInvestigateInTimelineAlertClick();
    }
    if (alertsEcsData != null) {
      await sendAlertToTimelineAction({
        createTimeline,
        ecsData: alertsEcsData,
        nonEcsData: nonEcsRowData ?? [],
        searchStrategyClient,
        updateTimelineIsLoading,
      });
    }

    if (ecsRowData != null) {
      await sendAlertToTimelineAction({
        createTimeline,
        ecsData: ecsRowData,
        nonEcsData: nonEcsRowData ?? [],
        searchStrategyClient,
        updateTimelineIsLoading,
      });
    }
  }, [
    alertsEcsData,
    createTimeline,
    ecsRowData,
    nonEcsRowData,
    onInvestigateInTimelineAlertClick,
    searchStrategyClient,
    updateTimelineIsLoading,
  ]);

  const investigateInTimelineAction = showInvestigateInTimelineAction
    ? [
        {
          name: ACTION_INVESTIGATE_IN_TIMELINE,
          onClick: investigateInTimelineAlertClick,
          disabled: isFetchingAlertEcs,
        },
      ]
    : [];

  return {
    investigateInTimelineAction,
    investigateInTimelineAlertClick,
    showInvestigateInTimelineAction,
  };
};
