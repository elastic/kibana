/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { Dictionary } from '@kbn/ml-url-state';
import { Moment } from 'moment';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { useEffect, useMemo, useState } from 'react';
import { mlTimefilterRefresh$, useTimefilter } from '@kbn/ml-date-picker';
import { merge } from 'rxjs';
import { RandomSampler } from '@kbn/ml-random-sampler-utils';
import { mapAndFlattenFilters } from '@kbn/data-plugin/public';
import { Query } from '@kbn/es-query';
import { SearchQueryLanguage } from '@kbn/ml-query-utils';
import { createMergedEsQuery } from '../../index_data_visualizer/utils/saved_search_utils';
import { useDataDriftStateManagerContext } from '../../data_drift/use_state_manager';
import type { InitialSettings } from '../../data_drift/use_data_drift_result';
import {
  type DocumentStatsSearchStrategyParams,
  useDocumentCountStats,
} from './use_document_count_stats';
import { useDataVisualizerKibana } from '../../kibana_context';
import { useTimeBuckets } from './use_time_buckets';

const DEFAULT_BAR_TARGET = 75;

export const useData = (
  initialSettings: InitialSettings,
  selectedDataView: DataView,
  contextId: string,
  searchString: Query['query'],
  searchQueryLanguage: SearchQueryLanguage,
  randomSampler: RandomSampler,
  randomSamplerProd: RandomSampler,
  onUpdate?: (params: Dictionary<unknown>) => void,
  barTarget: number = DEFAULT_BAR_TARGET,
  timeRange?: { min: Moment; max: Moment }
) => {
  const {
    services: {
      executionContext,
      uiSettings,
      data: { query: queryManager },
    },
  } = useDataVisualizerKibana();

  useExecutionContext(executionContext, {
    name: 'data_visualizer',
    type: 'application',
    id: contextId,
  });

  const [lastRefresh, setLastRefresh] = useState(0);

  const _timeBuckets = useTimeBuckets();
  const timefilter = useTimefilter({
    timeRangeSelector: selectedDataView?.timeFieldName !== undefined,
    autoRefreshSelector: true,
  });

  const { reference: referenceStateManager, comparison: comparisonStateManager } =
    useDataDriftStateManagerContext();

  const docCountRequestParams:
    | {
        reference: DocumentStatsSearchStrategyParams | undefined;
        comparison: DocumentStatsSearchStrategyParams | undefined;
      }
    | undefined = useMemo(
    () => {
      const searchQuery =
        searchString !== undefined && searchQueryLanguage !== undefined
          ? { query: searchString, language: searchQueryLanguage }
          : undefined;

      const timefilterActiveBounds = timeRange ?? timefilter.getActiveBounds();
      if (timefilterActiveBounds !== undefined) {
        _timeBuckets.setInterval('auto');
        _timeBuckets.setBounds(timefilterActiveBounds);
        _timeBuckets.setBarTarget(barTarget);
        const query = {
          earliest: timefilterActiveBounds.min?.valueOf(),
          latest: timefilterActiveBounds.max?.valueOf(),
          intervalMs: _timeBuckets.getInterval()?.asMilliseconds(),
          timeFieldName: selectedDataView.timeFieldName,
          runtimeFieldMap: selectedDataView.getRuntimeMappings(),
        };

        const refQuery = createMergedEsQuery(
          searchQuery,
          mapAndFlattenFilters([
            ...queryManager.filterManager.getFilters(),
            ...(referenceStateManager.filters ?? []),
          ]),
          selectedDataView,
          uiSettings
        );

        const compQuery = createMergedEsQuery(
          searchQuery,
          mapAndFlattenFilters([
            ...queryManager.filterManager.getFilters(),
            ...(comparisonStateManager.filters ?? []),
          ]),
          selectedDataView,
          uiSettings
        );

        return {
          reference: {
            ...query,
            searchQuery: refQuery,
            index: initialSettings ? initialSettings.reference : selectedDataView.getIndexPattern(),
          },
          comparison: {
            ...query,
            searchQuery: compQuery,
            index: initialSettings
              ? initialSettings.comparison
              : selectedDataView.getIndexPattern(),
          },
        };
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      lastRefresh,
      searchString,
      searchQueryLanguage,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify({
        timeRange,
        globalFilters: queryManager.filterManager.getFilters(),
        compFilters: comparisonStateManager?.filters,
        refFilters: referenceStateManager?.filters,
      }),
    ]
  );

  const documentStats = useDocumentCountStats(
    docCountRequestParams?.reference,
    lastRefresh,
    randomSampler
  );
  const documentStatsProd = useDocumentCountStats(
    docCountRequestParams?.comparison,
    lastRefresh,
    randomSamplerProd
  );

  useEffect(() => {
    const timefilterUpdateSubscription = merge(
      timefilter.getAutoRefreshFetch$(),
      timefilter.getTimeUpdate$(),
      mlTimefilterRefresh$
    ).subscribe(() => {
      if (onUpdate) {
        onUpdate({
          time: timefilter.getTime(),
          refreshInterval: timefilter.getRefreshInterval(),
        });
        setLastRefresh(Date.now());
      }
    });

    // This listens just for an initial update of the timefilter to be switched on.
    const timefilterEnabledSubscription = timefilter.getEnabledUpdated$().subscribe(() => {
      if (docCountRequestParams === undefined) {
        setLastRefresh(Date.now());
      }
    });

    return () => {
      timefilterUpdateSubscription.unsubscribe();
      timefilterEnabledSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    documentStats,
    documentStatsProd,
    timefilter,
    /** Start timestamp filter */
    earliest: Math.min(
      docCountRequestParams?.reference?.earliest ?? 0,
      docCountRequestParams?.comparison?.earliest ?? 0
    ),
    /** End timestamp filter */
    latest: Math.max(
      docCountRequestParams?.reference?.latest ?? 0,
      docCountRequestParams?.comparison?.latest ?? 0
    ),
    intervalMs: docCountRequestParams?.reference?.intervalMs,
    forceRefresh: () => setLastRefresh(Date.now()),
  };
};
