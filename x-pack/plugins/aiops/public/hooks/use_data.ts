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
import { aiOpsRefresh$ } from '../application/services/timefilter_refresh_service';
import { TimeBuckets } from '../../common/time_buckets';
import { useOverallStats } from './use_overall_stats';
import { Dictionary } from './url_state';
import { OverallStatsSearchStrategyParams } from '../get_document_stats';

export const useData = (
  currentDataView: DataView,
  onUpdate: (params: Dictionary<unknown>) => void
) => {
  const { services } = useAiOpsKibana();
  const { uiSettings } = services;
  const [lastRefresh, setLastRefresh] = useState(0);

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

  const fieldStatsRequest: OverallStatsSearchStrategyParams | undefined = useMemo(
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
        timeFieldName: currentDataView.timeFieldName,
        runtimeFieldMap: currentDataView.getRuntimeMappings(),
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [_timeBuckets, timefilter, currentDataView.id, lastRefresh]
  );
  const { overallStats } = useOverallStats(fieldStatsRequest, lastRefresh);

  useEffect(() => {
    const timeUpdateSubscription = merge(
      timefilter.getTimeUpdate$(),
      timefilter.getAutoRefreshFetch$(),
      aiOpsRefresh$
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
    overallStats,
    timefilter,
  };
};
