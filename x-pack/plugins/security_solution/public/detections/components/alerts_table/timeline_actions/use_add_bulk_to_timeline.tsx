/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineItem } from '@kbn/timelines-plugin/common';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { Filter } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import type { BulkActionsConfig } from '@kbn/triggers-actions-ui-plugin/public/types';
import type { CustomBulkAction } from '../../../../../common/types';
import { TableId } from '../../../../../common/types';
import { combineQueries } from '../../../../common/lib/kuery';
import { useKibana } from '../../../../common/lib/kibana';
import { BULK_ADD_TO_TIMELINE_LIMIT } from '../../../../../common/constants';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import type { TimelineArgs } from '../../../../timelines/containers';
import { useTimelineEventsHandler } from '../../../../timelines/containers';
import { eventsViewerSelector } from '../../../../common/components/events_viewer/selectors';
import type { State } from '../../../../common/store/types';
import { dispatchUpdateTimeline } from '../../../../timelines/components/open_timeline/helpers';
import { timelineActions } from '../../../../timelines/store/timeline';
import { useCreateTimeline } from '../../../../timelines/components/timeline/properties/use_create_timeline';
import { INVESTIGATE_BULK_IN_TIMELINE } from '../translations';
import { TimelineId, TimelineType } from '../../../../../common/types/timeline';
import { sendBulkEventsToTimelineAction } from '../actions';
import type { CreateTimelineProps } from '../types';
import { tableDefaults } from '../../../../common/store/data_table/defaults';
import type { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import type { Direction } from '../../../../../common/search_strategy';
import { setEventsLoading, setSelected } from '../../../../common/store/data_table/actions';

export interface UseAddBulkToTimelineActionProps {
  /* filters being passed to the Alert/events table */
  localFilters: Filter[];
  /* Table ID for which this hook is being used */
  tableId: TableId;
  /* start time being passed to the Events Table */
  from: string;
  /* End Time of the table being passed to the Events Table */
  to: string;
  /* Sourcerer Scope Id*/
  scopeId: SourcererScopeName;
}

/*
 * useAddBulkToTimelineAction  returns a bulk action that can be passed to the
 * TGrid so that multiple items at a time can be added to the timeline.
 *
 * It also syncs the timerange passed to the TGrid to that of  timeline
 *
 * */
export const useAddBulkToTimelineAction = ({
  localFilters,
  tableId,
  from,
  to,
  scopeId,
}: UseAddBulkToTimelineActionProps) => {
  const [disableActionOnSelectAll, setDisabledActionOnSelectAll] = useState(false);

  const {
    browserFields,
    dataViewId,
    runtimeMappings,
    indexPattern,
    // important to get selectedPatterns from useSourcererDataView
    // in order to include the exclude filters in the search that are not stored in the timeline
    selectedPatterns,
  } = useSourcererDataView(scopeId);
  const dispatch = useDispatch();
  const { uiSettings } = useKibana().services;

  const { filters, dataTable: { selectAll, totalCount, sort, selectedEventIds } = tableDefaults } =
    useSelector((state: State) => eventsViewerSelector(state, tableId));

  const esQueryConfig = useMemo(() => getEsQueryConfig(uiSettings), [uiSettings]);

  const timelineQuerySortField = sort.map(({ columnId, columnType, esTypes, sortDirection }) => ({
    field: columnId,
    direction: sortDirection as Direction,
    esTypes: esTypes ?? [],
    type: columnType,
  }));

  const combinedFilters = useMemo(() => [...localFilters, ...filters], [localFilters, filters]);

  const combinedQuery = combineQueries({
    config: esQueryConfig,
    dataProviders: [],
    indexPattern,
    filters: combinedFilters,
    kqlQuery: { query: '', language: 'kuery' },
    browserFields,
    kqlMode: 'filter',
  });

  const filterQuery = useMemo(() => {
    if (!combinedQuery) return '';
    return combinedQuery.filterQuery;
  }, [combinedQuery]);

  // in case user selects all items, we will use below handler to get the IDs of
  // all items (with max limit)
  const [, , searchhandler] = useTimelineEventsHandler({
    dataViewId,
    endDate: to,
    startDate: from,
    id: tableId,
    fields: ['_id', 'timestamp'],
    sort: timelineQuerySortField,
    indexNames: selectedPatterns,
    filterQuery,
    runtimeMappings,
    limit: Math.min(BULK_ADD_TO_TIMELINE_LIMIT, totalCount),
    timerangeKind: 'absolute',
  });

  useEffect(() => {
    if (!selectAll) {
      setDisabledActionOnSelectAll(false);
      return;
    }
    if (totalCount > BULK_ADD_TO_TIMELINE_LIMIT) {
      setDisabledActionOnSelectAll(true);
    } else {
      setDisabledActionOnSelectAll(false);
    }
  }, [selectAll, totalCount]);

  const clearActiveTimeline = useCreateTimeline({
    timelineId: TimelineId.active,
    timelineType: TimelineType.default,
  });

  const updateTimelineIsLoading = useCallback(
    (payload) => dispatch(timelineActions.updateIsLoading(payload)),
    [dispatch]
  );

  const createTimeline = useCallback(
    ({ timeline, ruleNote, timeline: { filters: eventIdFilters } }: CreateTimelineProps) => {
      clearActiveTimeline();
      updateTimelineIsLoading({ id: TimelineId.active, isLoading: false });
      dispatchUpdateTimeline(dispatch)({
        duplicate: true,
        from,
        id: TimelineId.active,
        notes: [],
        timeline: {
          ...timeline,
          indexNames: timeline.indexNames ?? [],
          show: true,
          filters: eventIdFilters,
        },
        to,
        ruleNote,
      })();
    },
    [dispatch, updateTimelineIsLoading, clearActiveTimeline, from, to]
  );

  const sendBulkEventsToTimelineHandler = useCallback(
    (items: TimelineItem[]) => {
      sendBulkEventsToTimelineAction(
        createTimeline,
        items.map((item) => item.ecs),
        'KqlFilter'
      );

      dispatch(
        setSelected({
          id: tableId,
          isSelectAllChecked: false,
          isSelected: false,
          eventIds: selectedEventIds,
        })
      );
    },
    [dispatch, createTimeline, selectedEventIds, tableId]
  );

  const onActionClick: BulkActionsConfig['onClick'] | CustomBulkAction['onClick'] = useCallback(
    (items: TimelineItem[] | undefined, isAllSelected: boolean, setLoading, clearSelection) => {
      if (!items) return;
      /*
       * Trigger actions table passed isAllSelected param
       *
       * and selectAll is used when using DataTable
       * */
      const onResponseHandler = (localResponse: TimelineArgs) => {
        sendBulkEventsToTimelineHandler(localResponse.events);
        if (tableId === TableId.alertsOnAlertsPage) {
          setLoading(false);
          clearSelection();
        } else {
          dispatch(
            setEventsLoading({
              id: tableId,
              isLoading: false,
              eventIds: Object.keys(selectedEventIds),
            })
          );
        }
      };

      if (isAllSelected || selectAll) {
        if (tableId === TableId.alertsOnAlertsPage) {
          setLoading(true);
        } else {
          dispatch(
            setEventsLoading({
              id: tableId,
              isLoading: true,
              eventIds: Object.keys(selectedEventIds),
            })
          );
        }
        searchhandler(onResponseHandler);
        return;
      }
      sendBulkEventsToTimelineHandler(items);
      clearSelection();
    },
    [dispatch, selectedEventIds, tableId, searchhandler, selectAll, sendBulkEventsToTimelineHandler]
  );

  const investigateInTimelineTitle = useMemo(() => {
    return disableActionOnSelectAll
      ? `${INVESTIGATE_BULK_IN_TIMELINE} ( max ${BULK_ADD_TO_TIMELINE_LIMIT} )`
      : INVESTIGATE_BULK_IN_TIMELINE;
  }, [disableActionOnSelectAll]);

  const memoized = useMemo(
    () => ({
      label: investigateInTimelineTitle,
      key: 'add-bulk-to-timeline',
      'data-test-subj': 'investigate-bulk-in-timeline',
      disableOnQuery: disableActionOnSelectAll,
      onClick: onActionClick,
    }),
    [disableActionOnSelectAll, investigateInTimelineTitle, onActionClick]
  );
  return memoized;
};
