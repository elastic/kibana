/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';

import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { sourcererActions } from '../../../../common/store/sourcerer';
import { getDataProvider } from '../../../../common/components/event_details/table/use_action_cell_data_provider';
import type { DataProvider, QueryOperator } from '../../../../../common/types/timeline';
import { TimelineId, TimelineType } from '../../../../../common/types/timeline';
import { useCreateTimeline } from '../../../../timelines/components/timeline/properties/use_create_timeline';
import { updateProviders } from '../../../../timelines/store/timeline/actions';
import { sourcererSelectors } from '../../../../common/store';
import type { TimeRange } from '../../../../common/store/inputs/model';

export interface Filter {
  field: string;
  value: string | string[];
  operator?: QueryOperator;
}

export const useNavigateToTimeline = () => {
  const dispatch = useDispatch();

  const getDataViewsSelector = useMemo(
    () => sourcererSelectors.getSourcererDataViewsSelector(),
    []
  );
  const { defaultDataView, signalIndexName } = useDeepEqualSelector((state) =>
    getDataViewsSelector(state)
  );

  const clearTimeline = useCreateTimeline({
    timelineId: TimelineId.active,
    timelineType: TimelineType.default,
  });

  const navigateToTimeline = useCallback(
    (dataProviders: DataProvider[], timeRange?: TimeRange) => {
      // Reset the current timeline
      clearTimeline({ timeRange });
      // Update the timeline's providers to match the current prevalence field query
      dispatch(
        updateProviders({
          id: TimelineId.active,
          providers: dataProviders,
        })
      );

      dispatch(
        sourcererActions.setSelectedDataView({
          id: SourcererScopeName.timeline,
          selectedDataViewId: defaultDataView.id,
          selectedPatterns: [signalIndexName || ''],
        })
      );
    },
    [clearTimeline, defaultDataView.id, dispatch, signalIndexName]
  );

  /** *
   * Open a timeline with the given filters prepopulated.
   * It accepts an array of Filter[]s where each item represents a set of AND queries, and each top level comma represents an OR.
   *
   * [[filter1 & filter2] OR [filter3 & filter4]]
   *
   * @param timeRange Defines the timeline time range field and removes the time range lock
   */
  const openTimelineWithFilters = useCallback(
    (filters: Array<[...Filter[]]>, timeRange?: TimeRange) => {
      const dataProviders = [];

      for (const orFilterGroup of filters) {
        const mainFilter = orFilterGroup[0];

        if (mainFilter) {
          const dataProvider = getDataProvider(
            mainFilter.field,
            uuidv4(),
            mainFilter.value,
            mainFilter.operator
          );

          for (const filter of orFilterGroup.slice(1)) {
            dataProvider.and.push(
              getDataProvider(filter.field, uuidv4(), filter.value, filter.operator)
            );
          }
          dataProviders.push(dataProvider);
        }
      }
      navigateToTimeline(dataProviders, timeRange);
    },
    [navigateToTimeline]
  );

  return {
    openTimelineWithFilters,
  };
};
