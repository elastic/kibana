/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { merge } from 'rxjs';
import type { Moment } from 'moment';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SignificantItem } from '@kbn/ml-agg-utils';
import type { Dictionary } from '@kbn/ml-url-state';
import { mlTimefilterRefresh$, useTimefilter } from '@kbn/ml-date-picker';
import { useTimeBuckets } from '@kbn/ml-time-buckets';
import { AIOPS_PLUGIN_ID } from '@kbn/aiops-common/constants';

import type { DocumentStatsSearchStrategyParams } from '../get_document_stats';
import type { GroupTableItem } from '../components/log_rate_analysis_results_table/types';

import { useAiopsAppContext } from './use_aiops_app_context';

import { useDocumentCountStats } from './use_document_count_stats';

const DEFAULT_BAR_TARGET = 75;

export const useData = (
  selectedDataView: DataView,
  contextId: string,
  searchQuery: estypes.QueryDslQueryContainer,
  onUpdate?: (params: Dictionary<unknown>) => void,
  selectedSignificantItem?: SignificantItem,
  selectedGroup: GroupTableItem | null = null,
  barTarget: number = DEFAULT_BAR_TARGET,
  timeRange?: { min: Moment; max: Moment }
) => {
  const { executionContext, uiSettings } = useAiopsAppContext();

  useExecutionContext(executionContext, {
    name: AIOPS_PLUGIN_ID,
    type: 'application',
    id: contextId,
  });

  const [lastRefresh, setLastRefresh] = useState(0);

  const _timeBuckets = useTimeBuckets(uiSettings);
  const timefilter = useTimefilter({
    timeRangeSelector: selectedDataView?.timeFieldName !== undefined,
    autoRefreshSelector: true,
  });
  const timeRangeMemoized = useMemo(
    () => timefilter.getActiveBounds(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lastRefresh, JSON.stringify(timefilter.getTime())]
  );

  const fieldStatsRequest: DocumentStatsSearchStrategyParams | undefined = useMemo(() => {
    const timefilterActiveBounds = timeRange ?? timeRangeMemoized;
    if (timefilterActiveBounds !== undefined) {
      _timeBuckets.setInterval('auto');
      _timeBuckets.setBounds(timefilterActiveBounds);
      _timeBuckets.setBarTarget(barTarget);
      return {
        earliest: timefilterActiveBounds.min?.valueOf(),
        latest: timefilterActiveBounds.max?.valueOf(),
        intervalMs: _timeBuckets.getInterval()?.asMilliseconds(),
        index: selectedDataView.getIndexPattern(),
        searchQuery,
        timeFieldName: selectedDataView.timeFieldName,
        runtimeFieldMap: selectedDataView.getRuntimeMappings(),
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastRefresh, searchQuery, timeRange, timeRangeMemoized]);

  const overallStatsRequest = useMemo(() => {
    return fieldStatsRequest
      ? {
          ...fieldStatsRequest,
          selectedSignificantItem,
          selectedGroup,
          includeSelectedSignificantItem: false,
        }
      : undefined;
  }, [fieldStatsRequest, selectedSignificantItem, selectedGroup]);

  const selectedSignificantItemStatsRequest = useMemo(() => {
    return fieldStatsRequest && (selectedSignificantItem || selectedGroup)
      ? {
          ...fieldStatsRequest,
          selectedSignificantItem,
          selectedGroup,
          includeSelectedSignificantItem: true,
        }
      : undefined;
  }, [fieldStatsRequest, selectedSignificantItem, selectedGroup]);

  const documentStats = useDocumentCountStats(
    overallStatsRequest,
    selectedSignificantItemStatsRequest,
    lastRefresh
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
      if (fieldStatsRequest === undefined) {
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
    timefilter,
    /** Start timestamp filter */
    earliest: fieldStatsRequest?.earliest,
    /** End timestamp filter */
    latest: fieldStatsRequest?.latest,
    intervalMs: fieldStatsRequest?.intervalMs,
    forceRefresh: () => setLastRefresh(Date.now()),
  };
};
