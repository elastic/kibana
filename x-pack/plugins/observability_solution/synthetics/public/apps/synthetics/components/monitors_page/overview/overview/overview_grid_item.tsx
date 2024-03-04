/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { MetricItem } from './metric_item';
import { useLast50DurationChart, useStatusByLocationOverview } from '../../../../hooks';
import { MonitorOverviewItem } from '../../../../../../../common/runtime_types';

export interface FlyoutParamProps {
  id: string;
  configId: string;
  location: string;
  locationId: string;
}

export const OverviewGridItem = ({
  monitor,
  onClick,
}: {
  monitor: MonitorOverviewItem;
  onClick: (params: FlyoutParamProps) => void;
}) => {
  const { timestamp } = useStatusByLocationOverview({
    configId: monitor.configId,
    locationId: monitor.location.id,
  });

  const { data, medianDuration, maxDuration, avgDuration, minDuration } = useLast50DurationChart({
    locationId: monitor.location?.id,
    monitorId: monitor.id,
    timestamp,
    schedule: monitor.schedule,
  });
  return (
    <MetricItem
      data={data}
      monitor={monitor}
      medianDuration={medianDuration}
      maxDuration={maxDuration}
      avgDuration={avgDuration}
      minDuration={minDuration}
      onClick={onClick}
    />
  );
};
