/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react'; //  useCallback, useRef
import type { DataView } from '@kbn/data-views-plugin/public';
import { merge } from 'rxjs';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { useAiOpsKibana } from '../kibana_context';
import { useTimefilter } from './use_time_filter';
import { aiopsRefresh$ } from '../application/services/timefilter_refresh_service';
import { TimeBuckets } from '../../common/time_buckets';
import { useDocumentCountStats } from './use_document_count_stats';
import { Dictionary } from './url_state';
import { DocumentStatsSearchStrategyParams } from '../get_document_stats';
import { getEsQueryFromSavedSearch } from '../application/utils/search_utils';
import { AiOpsIndexBasedAppState } from '../components/explain_log_rate_spikes/explain_log_rate_spikes_wrapper';

export const useData = (
  currentDataView: DataView,
  aiopsListState: AiOpsIndexBasedAppState,
  onUpdate: (params: Dictionary<unknown>) => void
) => {
  const { services } = useAiOpsKibana();
  const { uiSettings } = services;
  const [lastRefresh, setLastRefresh] = useState(0);
  const [fieldStatsRequest, setFieldStatsRequest] = useState<
    DocumentStatsSearchStrategyParams | undefined
  >();

  /** Prepare required params to pass to search strategy **/
  const { searchQueryLanguage, searchString, searchQuery } = useMemo(() => {
    const searchData = getEsQueryFromSavedSearch({
      dataView: currentDataView,
      uiSettings,
      savedSearch: undefined,
    });

    if (searchData === undefined || aiopsListState.searchString !== '') {
      if (aiopsListState.filters) {
        services.data.query.filterManager.setFilters(aiopsListState.filters);
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

  const { docStats } = useDocumentCountStats(fieldStatsRequest, lastRefresh);

  function updateFieldStatsRequest() {
    const timefilterActiveBounds = timefilter.getActiveBounds();
    if (timefilterActiveBounds !== undefined) {
      const BAR_TARGET = 75;
      _timeBuckets.setInterval('auto');
      _timeBuckets.setBounds(timefilterActiveBounds);
      _timeBuckets.setBarTarget(BAR_TARGET);
      setFieldStatsRequest({
        earliest: timefilterActiveBounds.min?.valueOf(),
        latest: timefilterActiveBounds.max?.valueOf(),
        intervalMs: _timeBuckets.getInterval()?.asMilliseconds(),
        index: currentDataView.title,
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
    docStats,
    timefilter,
    /** Start timestamp filter */
    earliest: fieldStatsRequest?.earliest,
    /** End timestamp filter */
    latest: fieldStatsRequest?.latest,
    searchQueryLanguage,
    searchString,
    searchQuery,
  };
};
