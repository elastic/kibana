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

import { SloItem } from '../types';
import { useKibana } from '../../../../utils/kibana_react';

const DEFAULT_INTERVAL = '60s';
const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD HH:mm';

interface Props {
  slos: SloItem[];
  timeRange: TimeRange;
  onLoaded?: () => void;
  showAllGroupByInstances?: boolean;
}

export function SloAlertsSummary({ slos, timeRange, onLoaded, showAllGroupByInstances }: Props) {
  const {
    services: {
      triggersActionsUi: { getAlertSummaryWidget: AlertSummaryWidget },
    },
  } = useKibana();

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
  const alertSummaryTimeRange = getAlertSummaryTimeRange(
    {
      from: timeRange.from,
      to: timeRange.to,
    },
    bucketSize?.intervalString ?? DEFAULT_INTERVAL,
    bucketSize?.dateFormat ?? DEFAULT_DATE_FORMAT
  );

  return (
    <AlertSummaryWidget
      featureIds={observabilityAlertFeatureIds}
      filter={esQuery}
      timeRange={alertSummaryTimeRange}
      fullSize
      onLoaded={() => {
        if (onLoaded) {
          onLoaded();
        }
      }}
    />
  );
}
