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
// import { SEARCH_QUERY_LANGUAGE } from '../../common/types'
import { getEsQueryFromSavedSearch } from '../../common/search_utils';

export const useData = (
  currentDataView: DataView,
  aiopsListState: any, // TODO: update
  onUpdate: (params: Dictionary<unknown>) => void
) => {
  const { services } = useAiOpsKibana();
  const { uiSettings } = services;
  const [lastRefresh, setLastRefresh] = useState(0);

  /** Prepare required params to pass to search strategy **/
  const { searchQueryLanguage, searchString, searchQuery } = useMemo(() => {
    const searchData = getEsQueryFromSavedSearch({
      dataView: currentDataView,
      uiSettings,
      savedSearch: undefined, // currentSavedSearch,
      // query: currentQuery,
      // filters: currentFilters,
      // filterManager: data.query.filterManager,
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
    // currentSavedSearch?.id,
    currentDataView.id,
    aiopsListState.searchString,
    aiopsListState.searchQueryLanguage,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify({
      searchQuery: aiopsListState.searchQuery,
      // currentQuery,
      // currentFilters,
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

  const fieldStatsRequest: DocumentStatsSearchStrategyParams | undefined = useMemo(
    () => {
      // Obtain the interval to use for date histogram aggregations
      // (such as the document count chart). Aim for 75 bars.
      const buckets = _timeBuckets;

      const tf = timefilter;

      if (!buckets || !tf || !currentDataView) return;

      const activeBounds = tf.getActiveBounds();
      let earliest: number | undefined;
      let latest: number | undefined;

      if (activeBounds !== undefined && currentDataView.timeFieldName !== undefined) {
        earliest = activeBounds.min?.valueOf();
        latest = activeBounds.max?.valueOf();
      }
      const bounds = tf.getActiveBounds();
      const BAR_TARGET = 75;
      buckets.setInterval('auto');

      if (bounds) {
        buckets.setBounds(bounds);
        buckets.setBarTarget(BAR_TARGET);
      }
      const aggInterval = buckets.getInterval();

      return {
        earliest,
        latest,
        intervalMs: aggInterval?.asMilliseconds(),
        index: currentDataView.title,
        searchQuery,
        timeFieldName: currentDataView.timeFieldName,
        runtimeFieldMap: currentDataView.getRuntimeMappings(),
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      _timeBuckets,
      timefilter,
      currentDataView.id,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify(searchQuery),
      lastRefresh,
    ]
  );
  const { docStats } = useDocumentCountStats(fieldStatsRequest, lastRefresh);

  useEffect(() => {
    const timeUpdateSubscription = merge(
      timefilter.getTimeUpdate$(),
      timefilter.getAutoRefreshFetch$(),
      aiopsRefresh$
    ).subscribe(() => {
      if (onUpdate) {
        onUpdate({
          time: timefilter.getTime(),
          refreshInterval: timefilter.getRefreshInterval(),
        });
      }
      setLastRefresh(Date.now());
    });
    return () => {
      timeUpdateSubscription.unsubscribe();
    };
  });

  return {
    docStats,
    timefilter,
    searchQueryLanguage,
    searchString,
    searchQuery,
  };
};
