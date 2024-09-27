/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { timelineDefaults } from '../timelines/store/defaults';
import { APP_UI_ID } from '../../common/constants';
import type { DataProvider } from '../../common/types';
import { TimelineId } from '../../common/types/timeline';
import { TimelineTypeEnum } from '../../common/api/timeline';
import { useStartTransaction } from '../common/lib/apm/use_start_transaction';
import { timelineActions } from '../timelines/store';
import { useCreateTimeline } from '../timelines/hooks/use_create_timeline';
import type { CreateTimelineProps } from '../detections/components/alerts_table/types';
import { useUpdateTimeline } from '../timelines/components/open_timeline/use_update_timeline';

interface UseInvestigateInTimelineActionProps {
  /**
   * Created when the user clicks on the Investigate in Timeline button.
   * DataProvider contain the field(s) and value(s) displayed in the timeline.
   */
  dataProviders: DataProvider[];
  /**
   * Start date used in the createTimeline method.
   */
  from: string;
  /**
   * End date used in the createTimeline method.
   */
  to: string;
}

/**
 * Hook passed down to the Threat Intelligence plugin, via context.
 * This code is closely duplicated from here: https://github.com/elastic/kibana/blob/main/x-pack/plugins/security_solution/public/detections/components/alerts_table/timeline_actions/use_investigate_in_timeline.tsx,
 * the main changes being:
 * - no exceptions are handled at the moment
 * - we use dataProviders, from and to directly instead of consuming ecsData
 */
export const useInvestigateInTimeline = ({
  dataProviders,
  from,
  to,
}: UseInvestigateInTimelineActionProps) => {
  const dispatch = useDispatch();
  const { startTransaction } = useStartTransaction();

  const updateTimelineIsLoading = useCallback(
    (payload: Parameters<typeof timelineActions.updateIsLoading>[0]) =>
      dispatch(timelineActions.updateIsLoading(payload)),
    [dispatch]
  );

  const clearActiveTimeline = useCreateTimeline({
    timelineId: TimelineId.active,
    timelineType: TimelineTypeEnum.default,
  });

  const updateTimeline = useUpdateTimeline();

  const createTimeline = useCallback(
    async ({ from: fromTimeline, timeline, to: toTimeline, ruleNote }: CreateTimelineProps) => {
      await clearActiveTimeline();
      updateTimelineIsLoading({ id: TimelineId.active, isLoading: false });
      updateTimeline({
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
      });
    },
    [updateTimeline, updateTimelineIsLoading, clearActiveTimeline]
  );

  const investigateInTimelineClick = useCallback(async () => {
    startTransaction({ name: `${APP_UI_ID} threat indicator investigateInTimeline` });
    createTimeline({
      from,
      notes: null,
      timeline: {
        ...timelineDefaults,
        dataProviders,
        id: TimelineId.active,
        indexNames: [],
        dateRange: {
          start: from,
          end: to,
        },
        eventType: 'all',
        filters: [],
        kqlQuery: {
          filterQuery: {
            kuery: {
              kind: 'kuery',
              expression: '',
            },
            serializedQuery: '',
          },
        },
      },
      to,
      ruleNote: '',
    });
  }, [startTransaction, createTimeline, dataProviders, from, to]);

  return investigateInTimelineClick;
};
