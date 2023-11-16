/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { getAlertSummaryTimeRange } from '../../../../utils/alert_summary_widget';
import { observabilityAlertFeatureIds } from '../../../../../common/constants';
import { useTimeBuckets } from '../../../../hooks/use_time_buckets';
import { calculateTimeRangeBucketSize } from '../../../../pages/overview/helpers/calculate_bucket_size';

type SloIdAndInstanceId = [string, string];
const DEFAULT_INTERVAL = '60s';
const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD HH:mm';

export function SloAlertsSummary({ slos, deps, timeRange }) {
  const {
    charts,
    triggersActionsUi: { getAlertSummaryWidget: AlertSummaryWidget },
  } = deps;
  const slosWithoutName = slos.map((slo) => ({
    id: slo.id,
    instanceId: slo.instanceId,
  }));
  const sloIdsAndInstanceIds = slosWithoutName.map(Object.values) as SloIdAndInstanceId[];
  const esQuery = {
    bool: {
      filter: [
        {
          range: {
            '@timestamp': {
              gte: timeRange.from,
            },
          },
        },
        {
          term: {
            'kibana.alert.rule.rule_type_id': 'slo.rules.burnRate',
          },
        },
      ],
      should: sloIdsAndInstanceIds.map(([sloId, instanceId]) => ({
        bool: {
          filter: [{ term: { 'slo.id': sloId } }, { term: { 'slo.instanceId': instanceId } }],
        },
      })),
      minimum_should_match: 1,
    },
  };
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
        bucketSize?.intervalString || DEFAULT_INTERVAL,
        bucketSize?.dateFormat || DEFAULT_DATE_FORMAT
      ),
    [timeRange.from, timeRange.to, bucketSize]
  );

  const chartProps = {
    theme: charts.theme.useChartsTheme(),
    baseTheme: charts.theme.useChartsBaseTheme(),
    onBrushEnd: () => {},
  };
  return (
    <AlertSummaryWidget
      featureIds={observabilityAlertFeatureIds}
      filter={esQuery}
      timeRange={alertSummaryTimeRange}
      chartProps={chartProps}
      fullSize
    />
  );
}
