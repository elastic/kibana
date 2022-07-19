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

export const useData = (
  currentDataView: DataView,
  onUpdate: (params: Dictionary<unknown>) => void
) => {
  const { services } = useAiOpsKibana();
  const { uiSettings } = services;
  const [lastRefresh, setLastRefresh] = useState(0);
  const [activeBounds, setActiveBounds] = useState<
    { earliest?: number; latest?: number } | undefined
  >();

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

  const fieldStatsRequest: DocumentStatsSearchStrategyParams | undefined = useMemo(() => {
    // Obtain the interval to use for date histogram aggregations
    // (such as the document count chart). Aim for 75 bars.

    if (!activeBounds || activeBounds.earliest === undefined || activeBounds.latest === undefined)
      return;

    const timefilterActiveBounds = timefilter.getActiveBounds();

    if (!timefilterActiveBounds) return;

    const BAR_TARGET = 75;
    _timeBuckets.setInterval('auto');
    _timeBuckets.setBounds(timefilterActiveBounds);
    _timeBuckets.setBarTarget(BAR_TARGET);
    const aggInterval = _timeBuckets.getInterval();

    return {
      earliest: activeBounds.earliest,
      latest: activeBounds.latest,
      intervalMs: aggInterval?.asMilliseconds(),
      index: currentDataView.title,
      timeFieldName: currentDataView.timeFieldName,
      runtimeFieldMap: currentDataView.getRuntimeMappings(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    _timeBuckets,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    activeBounds === undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(timefilter.getTime()),
    currentDataView.id,
    lastRefresh,
  ]);
  const { docStats } = useDocumentCountStats(fieldStatsRequest, lastRefresh);

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
      const timefilterActiveBounds = timefilter.getActiveBounds();
      if (timefilterActiveBounds !== undefined) {
        setActiveBounds({
          earliest: timefilterActiveBounds.min?.valueOf(),
          latest: timefilterActiveBounds.max?.valueOf(),
        });
      }
      setLastRefresh(Date.now());
    });
    return () => {
      timeUpdateSubscription.unsubscribe();
    };
  });

  // This hook listens just for an initial update of the timefilter to be switched on.
  useEffect(() => {
    const timeUpdateSubscription = timefilter.getEnabledUpdated$().subscribe(() => {
      const timefilterActiveBounds = timefilter.getActiveBounds();

      if (timefilterActiveBounds && activeBounds === undefined) {
        setActiveBounds({
          earliest: timefilterActiveBounds.min?.valueOf(),
          latest: timefilterActiveBounds.max?.valueOf(),
        });
        setLastRefresh(Date.now());
      }
    });
    return () => {
      timeUpdateSubscription.unsubscribe();
    };
  });

  return {
    docStats,
    timefilter,
    earliest: activeBounds?.earliest,
    latest: activeBounds?.latest,
  };
};
