/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { merge } from 'rxjs';

import type { DataView } from '@kbn/data-views-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { ChangePoint } from '@kbn/ml-agg-utils';

import type { SavedSearch } from '@kbn/discover-plugin/public';

import { TimeBuckets } from '../../common/time_buckets';

import { useAiopsAppContext } from './use_aiops_app_context';
import { aiopsRefresh$ } from '../application/services/timefilter_refresh_service';
import type { DocumentStatsSearchStrategyParams } from '../get_document_stats';
import type { AiOpsIndexBasedAppState } from '../components/explain_log_rate_spikes/explain_log_rate_spikes_app_state';
import {
  getEsQueryFromSavedSearch,
  SavedSearchSavedObject,
} from '../application/utils/search_utils';

import { useTimefilter } from './use_time_filter';
import { useDocumentCountStats } from './use_document_count_stats';
import type { Dictionary } from './use_url_state';
import type { GroupTableItem } from '../components/spike_analysis_table/spike_analysis_table_groups';

const DEFAULT_BAR_TARGET = 75;

export const useData = (
  {
    currentDataView,
    currentSavedSearch,
  }: { currentDataView: DataView; currentSavedSearch: SavedSearch | SavedSearchSavedObject | null },
  aiopsListState: AiOpsIndexBasedAppState,
  onUpdate: (params: Dictionary<unknown>) => void,
  selectedChangePoint?: ChangePoint,
  selectedGroup?: GroupTableItem | null,
  barTarget: number = DEFAULT_BAR_TARGET
) => {
  const {
    uiSettings,
    data: {
      query: { filterManager },
    },
  } = useAiopsAppContext();

  const [lastRefresh, setLastRefresh] = useState(0);
  const [fieldStatsRequest, setFieldStatsRequest] = useState<
    DocumentStatsSearchStrategyParams | undefined
  >();

  /** Prepare required params to pass to search strategy **/
  const { searchQueryLanguage, searchString, searchQuery } = useMemo(() => {
    const searchData = getEsQueryFromSavedSearch({
      dataView: currentDataView,
      uiSettings,
      savedSearch: currentSavedSearch,
      filterManager,
    });

    if (searchData === undefined || aiopsListState.searchString !== '') {
      if (aiopsListState.filters) {
        const globalFilters = filterManager?.getGlobalFilters();

        if (filterManager) filterManager.setFilters(aiopsListState.filters);
        if (globalFilters) filterManager?.addFilters(globalFilters);
      }
      return {
        searchQuery: aiopsListState.searchQuery,
        searchString: aiopsListState.searchString,
        searchQueryLanguage: aiopsListState.searchQueryLanguage,
      };
    } else {
      return {
        searchQuery: searchData.searchQuery,
        searchString: searchData.searchString,
        searchQueryLanguage: searchData.queryLanguage,
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentSavedSearch?.id,
    currentDataView.id,
    aiopsListState.searchString,
    aiopsListState.searchQueryLanguage,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify({
      searchQuery: aiopsListState.searchQuery,
    }),
    lastRefresh,
  ]);

  const _timeBuckets = useMemo(() => {
    return new TimeBuckets({
      [UI_SETTINGS.HISTOGRAM_MAX_BARS]: uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS),
      [UI_SETTINGS.HISTOGRAM_BAR_TARGET]: uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
      dateFormat: uiSettings.get('dateFormat'),
      'dateFormat:scaled': uiSettings.get('dateFormat:scaled'),
    });
  }, [uiSettings]);

  const timefilter = useTimefilter({
    timeRangeSelector: currentDataView?.timeFieldName !== undefined,
    autoRefreshSelector: true,
  });

  const overallStatsRequest = useMemo(() => {
    return fieldStatsRequest
      ? {
          ...fieldStatsRequest,
          selectedChangePoint,
          selectedGroup,
          includeSelectedChangePoint: false,
        }
      : undefined;
  }, [fieldStatsRequest, selectedChangePoint, selectedGroup]);

  const selectedChangePointStatsRequest = useMemo(() => {
    return fieldStatsRequest && (selectedChangePoint || selectedGroup)
      ? {
          ...fieldStatsRequest,
          selectedChangePoint,
          selectedGroup,
          includeSelectedChangePoint: true,
        }
      : undefined;
  }, [fieldStatsRequest, selectedChangePoint, selectedGroup]);

  const documentStats = useDocumentCountStats(
    overallStatsRequest,
    selectedChangePointStatsRequest,
    lastRefresh
  );

  function updateFieldStatsRequest() {
    const timefilterActiveBounds = timefilter.getActiveBounds();
    if (timefilterActiveBounds !== undefined) {
      _timeBuckets.setInterval('auto');
      _timeBuckets.setBounds(timefilterActiveBounds);
      _timeBuckets.setBarTarget(barTarget);
      setFieldStatsRequest({
        earliest: timefilterActiveBounds.min?.valueOf(),
        latest: timefilterActiveBounds.max?.valueOf(),
        intervalMs: _timeBuckets.getInterval()?.asMilliseconds(),
        index: currentDataView.getIndexPattern(),
        searchQuery,
        timeFieldName: currentDataView.timeFieldName,
        runtimeFieldMap: currentDataView.getRuntimeMappings(),
      });
      setLastRefresh(Date.now());
    }
  }

  useEffect(() => {
    const timeUpdateSubscription = merge(
      timefilter.getAutoRefreshFetch$(),
      timefilter.getTimeUpdate$(),
      aiopsRefresh$
    ).subscribe(() => {
      if (onUpdate) {
        onUpdate({
          time: timefilter.getTime(),
          refreshInterval: timefilter.getRefreshInterval(),
        });
      }
      updateFieldStatsRequest();
    });
    return () => {
      timeUpdateSubscription.unsubscribe();
    };
  });

  // This hook listens just for an initial update of the timefilter to be switched on.
  useEffect(() => {
    const timeUpdateSubscription = timefilter.getEnabledUpdated$().subscribe(() => {
      if (fieldStatsRequest === undefined) {
        updateFieldStatsRequest();
      }
    });
    return () => {
      timeUpdateSubscription.unsubscribe();
    };
  });

  // Ensure request is updated when search changes
  useEffect(() => {
    updateFieldStatsRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchString, JSON.stringify(searchQuery)]);

  return {
    documentStats,
    timefilter,
    /** Start timestamp filter */
    earliest: fieldStatsRequest?.earliest,
    /** End timestamp filter */
    latest: fieldStatsRequest?.latest,
    intervalMs: fieldStatsRequest?.intervalMs,
    searchQueryLanguage,
    searchString,
    searchQuery,
  };
};
