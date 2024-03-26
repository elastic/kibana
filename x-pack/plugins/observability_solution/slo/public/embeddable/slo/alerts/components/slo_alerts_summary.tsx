/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import type { TimeRange } from '@kbn/es-query';
import { useTimeBuckets } from '@kbn/observability-plugin/public';
import { getAlertSummaryTimeRange } from '@kbn/observability-plugin/public';
import { calculateTimeRangeBucketSize } from '@kbn/observability-plugin/public';
import { observabilityAlertFeatureIds } from '@kbn/observability-plugin/common';
import { useSloAlertsQuery } from './slo_alerts_table';

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
