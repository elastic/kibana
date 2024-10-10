/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { MetricTypes } from '../../../common/rest_types';
import { ChartPanel } from './chart_panel';
import { UsageMetricsResponseSchemaBody } from '../../../common/rest_types';
interface ChartsProps {
  data: UsageMetricsResponseSchemaBody;
}

export const Charts: React.FC<ChartsProps> = ({ data }) => {
  const [popoverOpen, setPopoverOpen] = useState<string | null>(null);
  const togglePopover = useCallback((streamName: string | null) => {
    setPopoverOpen((prev) => (prev === streamName ? null : streamName));
  }, []);

  return (
    <EuiFlexGroup direction="column">
      {Object.entries(data.metrics).map(([metricType, series], idx) => (
        <ChartPanel
          key={metricType}
          metricType={metricType as MetricTypes}
          series={series}
          idx={idx}
          popoverOpen={popoverOpen}
          togglePopover={togglePopover}
        />
      ))}
    </EuiFlexGroup>
  );
};
