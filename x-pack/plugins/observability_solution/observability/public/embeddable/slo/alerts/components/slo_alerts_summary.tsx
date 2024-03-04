/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import type { TimeRange } from '@kbn/es-query';
import { useSloAlertsQuery } from './slo_alerts_table';
import { getAlertSummaryTimeRange } from '../../../../utils/alert_summary_widget';
import { observabilityAlertFeatureIds } from '../../../../../common/constants';
import { useTimeBuckets } from '../../../../hooks/use_time_buckets';
import { calculateTimeRangeBucketSize } from '../../../../pages/overview/helpers/calculate_bucket_size';
import { SloEmbeddableDeps } from '../slo_alerts_embeddable';
import { SloItem } from '../types';

const DEFAULT_INTERVAL = '60s';
const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD HH:mm';

interface Props {
  deps: SloEmbeddableDeps;
  slos: SloItem[];
  timeRange: TimeRange;
  onLoaded?: () => void;
  showAllGroupByInstances?: boolean;
}

export function SloAlertsSummary({
  slos,
  deps,
  timeRange,
  onLoaded,
  showAllGroupByInstances,
}: Props) {
  const {
    charts,
    triggersActionsUi: { getAlertSummaryWidget: AlertSummaryWidget },
  } = deps;

  const esQuery = useSloAlertsQuery(slos, timeRange, showAllGroupByInstances);
  const timeBuckets = useTimeBuckets();
  const bucketSize = useMemo(
    () =>
      calculateTimeRangeBucketSize(
        {
          from: timeRange.from,
          to: timeRange.to,
        },
        timeBuckets
      ),
    [timeRange.from, timeRange.to, timeBuckets]
  );
  const alertSummaryTimeRange = useMemo(
    () =>
      getAlertSummaryTimeRange(
        {
          from: timeRange.from,
          to: timeRange.to,
        },
        bucketSize?.intervalString ?? DEFAULT_INTERVAL,
        bucketSize?.dateFormat ?? DEFAULT_DATE_FORMAT
      ),
    [timeRange.from, timeRange.to, bucketSize]
  );

  const chartProps = {
    theme: charts.theme.useChartsTheme(),
    baseTheme: charts.theme.useChartsBaseTheme(),
  };
  return (
    <AlertSummaryWidget
      featureIds={observabilityAlertFeatureIds}
      filter={esQuery}
      timeRange={alertSummaryTimeRange}
      chartProps={chartProps}
      fullSize
      onLoaded={() => {
        if (onLoaded) {
          onLoaded();
        }
      }}
    />
  );
}
