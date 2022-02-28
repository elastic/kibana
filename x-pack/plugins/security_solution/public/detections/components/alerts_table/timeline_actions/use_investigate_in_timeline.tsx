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

import { TimelineId, TimelineType } from '../../../../../common/types/timeline';
import { Ecs } from '../../../../../common/ecs';
import { timelineActions, timelineSelectors } from '../../../../timelines/store/timeline';
import { sendAlertToTimelineAction } from '../actions';
import { dispatchUpdateTimeline } from '../../../../timelines/components/open_timeline/helpers';
import { useCreateTimeline } from '../../../../timelines/components/timeline/properties/use_create_timeline';
import { CreateTimelineProps } from '../types';
import { ACTION_INVESTIGATE_IN_TIMELINE } from '../translations';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';

interface UseInvestigateInTimelineActionProps {
  ecsRowData?: Ecs | Ecs[] | null;
  onInvestigateInTimelineAlertClick?: () => void;
}

export const useInvestigateInTimeline = ({
  ecsRowData,
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

  const clearActiveTimeline = useCreateTimeline({
    timelineId: TimelineId.active,
    timelineType: TimelineType.default,
  });

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
          filterManager,
          indexNames: timeline.indexNames ?? [],
          show: true,
        },
        to: toTimeline,
        ruleNote,
      })();
    },
    [dispatch, filterManager, updateTimelineIsLoading, clearActiveTimeline]
  );

  const investigateInTimelineAlertClick = useCallback(async () => {
    if (onInvestigateInTimelineAlertClick) {
      onInvestigateInTimelineAlertClick();
    }
    if (ecsRowData != null) {
      await sendAlertToTimelineAction({
        createTimeline,
        ecsData: ecsRowData,
        searchStrategyClient,
        updateTimelineIsLoading,
      });
    }
  }, [
    createTimeline,
    ecsRowData,
    onInvestigateInTimelineAlertClick,
    searchStrategyClient,
    updateTimelineIsLoading,
  ]);

  const investigateInTimelineActionItems = useMemo(
    () => [
      <EuiContextMenuItem
        key="investigate-in-timeline-action-item"
        data-test-subj="investigate-in-timeline-action-item"
        disabled={ecsRowData == null}
        onClick={investigateInTimelineAlertClick}
      >
        {ACTION_INVESTIGATE_IN_TIMELINE}
      </EuiContextMenuItem>,
    ],
    [ecsRowData, investigateInTimelineAlertClick]
  );

  return {
    investigateInTimelineActionItems,
    investigateInTimelineAlertClick,
  };
};
