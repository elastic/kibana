/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { MetricItem } from './metric_item';
import { useLast50DurationChart } from '../../../../hooks';

export const OverviewGridItem = ({
  monitorId,
  monitorName,
  locationId,
  isMonitorEnabled,
}: {
  monitorId: string;
  monitorName: string;
  locationId: string;
  isMonitorEnabled: boolean;
}) => {
  const { data, loading, averageDuration } = useLast50DurationChart({ locationId, monitorId });
  return (
    <MetricItem
      monitorId={monitorId}
      monitorName={monitorName}
      isMonitorEnabled={isMonitorEnabled}
      locationId={locationId}
      data={data}
      loaded={!loading}
      averageDuration={averageDuration}
    />
  );
};
