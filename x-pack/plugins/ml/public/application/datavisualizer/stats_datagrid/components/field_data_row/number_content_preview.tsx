/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import { FieldDataCardProps } from '../../../index_based/components/field_data_card';
import {
  MetricDistributionChart,
  MetricDistributionChartData,
  buildChartDataFromStats,
} from '../../../index_based/components/field_data_card/metric_distribution_chart';

const METRIC_DISTRIBUTION_CHART_WIDTH = 400;
const METRIC_DISTRIBUTION_CHART_HEIGHT = 80;

export const NumberContentPreview: FC<FieldDataCardProps> = ({ config }) => {
  const { stats, fieldFormat } = config;

  useEffect(() => {
    const chartData = buildChartDataFromStats(stats, METRIC_DISTRIBUTION_CHART_WIDTH);
    setDistributionChartData(chartData);
  }, []);

  const defaultChartData: MetricDistributionChartData[] = [];
  const [distributionChartData, setDistributionChartData] = useState(defaultChartData);

  return (
    <MetricDistributionChart
      width={METRIC_DISTRIBUTION_CHART_WIDTH}
      height={METRIC_DISTRIBUTION_CHART_HEIGHT}
      chartData={distributionChartData}
      fieldFormat={fieldFormat}
      hideXAxis={true}
    />
  );
};
