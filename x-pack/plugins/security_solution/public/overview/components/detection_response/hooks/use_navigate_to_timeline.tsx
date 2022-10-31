/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { sourcererActions } from '../../../../common/store/sourcerer';
import { getDataProvider } from '../../../../common/components/event_details/table/use_action_cell_data_provider';
import type { DataProvider } from '../../../../../common/types/timeline';
import { TimelineId, TimelineType } from '../../../../../common/types/timeline';
import { useCreateTimeline } from '../../../../timelines/components/timeline/properties/use_create_timeline';
import { updateProviders } from '../../../../timelines/store/timeline/actions';
import { sourcererSelectors } from '../../../../common/store';
import type { TimeRange } from '../../../../common/store/inputs/model';

export interface Filter {
  field: string;
  value: string;
}

interface NavigateToTimelineOptions {
  timeRange?: TimeRange;
  onlyAlerts?: boolean;
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
    (dataProviders: DataProvider[], options?: NavigateToTimelineOptions) => {
      // Reset the current timeline
      clearTimeline({ timeRange: options?.timeRange });
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
          selectedPatterns: options?.onlyAlerts
            ? [signalIndexName || '']
            : defaultDataView.patternList,
        })
      );
    },
    [clearTimeline, defaultDataView.id, defaultDataView.patternList, dispatch, signalIndexName]
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
    (filters: Array<[...Filter[]]>, options?: NavigateToTimelineOptions) => {
      const dataProviders = [];

      for (const orFilterGroup of filters) {
        const mainFilter = orFilterGroup[0];

        if (mainFilter) {
          const dataProvider = getDataProvider(mainFilter.field, '', mainFilter.value);

          for (const filter of orFilterGroup.slice(1)) {
            dataProvider.and.push(getDataProvider(filter.field, '', filter.value));
          }
          dataProviders.push(dataProvider);
        }
      }
      navigateToTimeline(dataProviders, options);
    },
    [navigateToTimeline]
  );

  return {
    openTimelineWithFilters,
  };
};
