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
import { getEventType } from '../../../../timelines/components/timeline/body/helpers';

interface UseInvestigateInTimelineActionProps {
  ecsRowData: Ecs | null;
  nonEcsRowData: TimelineNonEcsData[];
  alertIds?: string[];
  fetchEcsAlertsData?: (alertIds?: string[]) => Promise<Ecs[]>;
  onInvestigateInTimelineAlertClick?: () => void;
}

export const useInvestigateInTimeline = ({
  ecsRowData,
  nonEcsRowData,
  alertIds,
  fetchEcsAlertsData,
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

  const investigateInTimelineAlertClick = useCallback(async () => {
    if (onInvestigateInTimelineAlertClick) {
      onInvestigateInTimelineAlertClick();
    }
    try {
      if (ecsRowData != null) {
        await sendAlertToTimelineAction({
          createTimeline,
          ecsData: ecsRowData,
          nonEcsData: nonEcsRowData,
          searchStrategyClient,
          updateTimelineIsLoading,
        });
      }
      if (ecsRowData == null && fetchEcsAlertsData) {
        const alertsEcsData = await fetchEcsAlertsData(alertIds);
        await sendAlertToTimelineAction({
          createTimeline,
          ecsData: alertsEcsData,
          nonEcsData: nonEcsRowData,
          searchStrategyClient,
          updateTimelineIsLoading,
        });
      }
    } catch {
      // TODO show a toaster that something went wrong
    }
  }, [
    alertIds,
    createTimeline,
    ecsRowData,
    fetchEcsAlertsData,
    nonEcsRowData,
    onInvestigateInTimelineAlertClick,
    searchStrategyClient,
    updateTimelineIsLoading,
  ]);
  const eventType = ecsRowData != null ? getEventType(ecsRowData) : null;
  const showInvestigateInTimelineAction = eventType === 'signal' && ecsRowData != null;

  const investigateInTimelineAction = showInvestigateInTimelineAction
    ? [
        {
          name: ACTION_INVESTIGATE_IN_TIMELINE,
          onClick: investigateInTimelineAlertClick,
        },
      ]
    : [];

  return {
    investigateInTimelineAction,
    investigateInTimelineAlertClick,
    showInvestigateInTimelineAction,
  };
};
