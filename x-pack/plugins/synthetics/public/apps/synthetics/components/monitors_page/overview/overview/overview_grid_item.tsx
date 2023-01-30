/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { MetricItem } from './metric_item';
import { useLast50DurationChart } from '../../../../hooks';
import { MonitorOverviewItem } from '../../../../../../../common/runtime_types';

export const OverviewGridItem = ({
  monitor,
  onClick,
}: {
  monitor: MonitorOverviewItem;
  onClick: (params: { id: string; configId: string; location: string; locationId: string }) => void;
}) => {
  const { data, loading, averageDuration } = useLast50DurationChart({
    locationId: monitor.location?.id,
    monitorId: monitor.id,
  });
  return (
    <MetricItem
      data={data}
      monitor={monitor}
      loaded={!loading}
      averageDuration={averageDuration}
      onClick={onClick}
    />
  );
};
