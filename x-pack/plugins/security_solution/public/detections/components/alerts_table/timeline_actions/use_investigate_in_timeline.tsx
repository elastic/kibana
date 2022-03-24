/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { EuiContextMenuItem } from '@elastic/eui';

import { ALERT_RULE_EXCEPTIONS_LIST } from '@kbn/rule-data-utils';
import {
  ExceptionListIdentifiers,
  ExceptionListItemSchema,
  ReadExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { useApi } from '@kbn/securitysolution-list-hooks';

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
import { getField } from '../../../../helpers';

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

  const { services } = useKibana();
  const { getExceptionListsItems } = useApi(services.http);

  const getExceptions = useCallback(
    async (ecsData: Ecs): Promise<ExceptionListItemSchema[]> => {
      const exceptionsLists: ReadExceptionListSchema[] = (
        getField(ecsData, ALERT_RULE_EXCEPTIONS_LIST) ?? []
      )
        .map((list: string) => JSON.parse(list))
        .filter((list: ExceptionListIdentifiers) => list.type === 'detection');

      const allExceptions: ExceptionListItemSchema[] = [];

      if (exceptionsLists.length > 0) {
        for (const list of exceptionsLists) {
          if (list.id && list.list_id && list.namespace_type) {
            await getExceptionListsItems({
              lists: [
                {
                  id: list.id,
                  listId: list.list_id,
                  type: 'detection',
                  namespaceType: list.namespace_type,
                },
              ],
              filterOptions: [],
              pagination: {
                page: 0,
                perPage: 10000,
                total: 10000,
              },
              showDetectionsListsOnly: true,
              showEndpointListsOnly: false,
              onSuccess: ({ exceptions }) => {
                allExceptions.push(...exceptions);
              },
              onError: () => {},
            });
          }
        }
      }
      return allExceptions;
    },
    [getExceptionListsItems]
  );

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
        getExceptions,
      });
    }
  }, [
    createTimeline,
    ecsRowData,
    onInvestigateInTimelineAlertClick,
    searchStrategyClient,
    updateTimelineIsLoading,
    getExceptions,
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
