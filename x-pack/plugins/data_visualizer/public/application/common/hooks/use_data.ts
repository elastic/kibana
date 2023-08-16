/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Dictionary } from '@kbn/ml-url-state';
import { Moment } from 'moment';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { useEffect, useMemo, useState } from 'react';
import { mlTimefilterRefresh$, useTimefilter } from '@kbn/ml-date-picker';
import { merge } from 'rxjs';
import { RandomSampler } from '@kbn/ml-random-sampler-utils';
import {
  DocumentStatsSearchStrategyParams,
  useDocumentCountStats,
} from './use_document_count_stats';
import { useDataVisualizerKibana } from '../../kibana_context';
import { useTimeBuckets } from './use_time_buckets';

const DEFAULT_BAR_TARGET = 75;

export const useData = (
  selectedDataView: DataView,
  contextId: string,
  searchQuery: estypes.QueryDslQueryContainer,
  randomSampler: RandomSampler,
  onUpdate?: (params: Dictionary<unknown>) => void,
  barTarget: number = DEFAULT_BAR_TARGET,
  timeRange?: { min: Moment; max: Moment }
) => {
  const {
    services: { executionContext },
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

  const docCountRequestParams: DocumentStatsSearchStrategyParams | undefined = useMemo(() => {
    const timefilterActiveBounds = timeRange ?? timefilter.getActiveBounds();
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
  }, [lastRefresh, JSON.stringify({ searchQuery, timeRange })]);

  const documentStats = useDocumentCountStats(docCountRequestParams, lastRefresh, randomSampler);

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
    timefilter,
    /** Start timestamp filter */
    earliest: docCountRequestParams?.earliest,
    /** End timestamp filter */
    latest: docCountRequestParams?.latest,
    intervalMs: docCountRequestParams?.intervalMs,
    forceRefresh: () => setLastRefresh(Date.now()),
  };
};
