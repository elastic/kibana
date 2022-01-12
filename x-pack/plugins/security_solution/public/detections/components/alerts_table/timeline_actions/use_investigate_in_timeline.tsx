/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { EuiContextMenuItem } from '@elastic/eui';
import { useKibana } from '../../../../common/lib/kibana';

import { TimelineId } from '../../../../../common/types/timeline';
import { Ecs } from '../../../../../common/ecs';
import { TimelineNonEcsData } from '../../../../../common/search_strategy/timeline';
import { timelineActions, timelineSelectors } from '../../../../timelines/store/timeline';
import { sendAlertToTimelineAction } from '../actions';
import { dispatchUpdateTimeline } from '../../../../timelines/components/open_timeline/helpers';
import { CreateTimelineProps } from '../types';
import { ACTION_INVESTIGATE_IN_TIMELINE } from '../translations';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useFetchEcsAlertsData } from '../../../containers/detection_engine/alerts/use_fetch_ecs_alerts_data';

interface UseInvestigateInTimelineActionProps {
  ecsRowData?: Ecs | Ecs[] | null;
  nonEcsRowData?: TimelineNonEcsData[];
  alertIds?: string[] | null | undefined;
  onInvestigateInTimelineAlertClick?: () => void;
}

export const useInvestigateInTimeline = ({
  ecsRowData,
  alertIds,
  onInvestigateInTimelineAlertClick,
}: UseInvestigateInTimelineActionProps) => {
  const {
    data: { search: searchStrategyClient, query },
  } = useKibana().services;
  const dispatch = useDispatch();

  const filterManagerBackup = useMemo(() => query.filterManager, [query.filterManager]);
  const getManageTimeline = useMemo(() => timelineSelectors.getManageTimelineById(), []);
  const { filterManager: activeFilterManager } = useDeepEqualSelector((state) =>
    getManageTimeline(state, TimelineId.active ?? '')
  );
  const filterManager = useMemo(
    () => activeFilterManager ?? filterManagerBackup,
    [activeFilterManager, filterManagerBackup]
  );

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
          filterManager,
          indexNames: timeline.indexNames ?? [],
          show: true,
        },
        to: toTimeline,
        ruleNote,
      })();
    },
    [dispatch, filterManager, updateTimelineIsLoading]
  );

  const showInvestigateInTimelineAction = alertIds != null;
  const { isLoading: isFetchingAlertEcs, alertsEcsData } = useFetchEcsAlertsData({
    alertIds,
    skip: alertIds == null,
  });

  const investigateInTimelineAlertClick = useCallback(async () => {
    if (onInvestigateInTimelineAlertClick) {
      onInvestigateInTimelineAlertClick();
    }
    if (alertsEcsData != null) {
      await sendAlertToTimelineAction({
        createTimeline,
        ecsData: alertsEcsData,
        searchStrategyClient,
        updateTimelineIsLoading,
      });
    } else if (ecsRowData != null) {
      await sendAlertToTimelineAction({
        createTimeline,
        ecsData: ecsRowData,
        searchStrategyClient,
        updateTimelineIsLoading,
      });
    }
  }, [
    alertsEcsData,
    createTimeline,
    ecsRowData,
    onInvestigateInTimelineAlertClick,
    searchStrategyClient,
    updateTimelineIsLoading,
  ]);

  const investigateInTimelineActionItems = showInvestigateInTimelineAction
    ? [
        <EuiContextMenuItem
          key="investigate-in-timeline-action-item"
          data-test-subj="investigate-in-timeline-action-item"
          disabled={ecsRowData == null && isFetchingAlertEcs === true}
          onClick={investigateInTimelineAlertClick}
        >
          {ACTION_INVESTIGATE_IN_TIMELINE}
        </EuiContextMenuItem>,
      ]
    : [];

  return {
    investigateInTimelineActionItems,
    investigateInTimelineAlertClick,
    showInvestigateInTimelineAction,
  };
};
