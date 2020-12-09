/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FieldDataCardProps } from '../../../index_based/components/field_data_card';
import {
  MetricDistributionChart,
  MetricDistributionChartData,
  buildChartDataFromStats,
} from '../../../index_based/components/field_data_card/metric_distribution_chart';

const METRIC_DISTRIBUTION_CHART_WIDTH = 200;
const METRIC_DISTRIBUTION_CHART_HEIGHT = 80;

export const NumberContentPreview: FC<FieldDataCardProps> = ({ config }) => {
  const { stats, fieldFormat, fieldName } = config;
  const defaultChartData: MetricDistributionChartData[] = [];
  const [distributionChartData, setDistributionChartData] = useState(defaultChartData);
  const [legendText, setLegendText] = useState<{ min: number; max: number } | undefined>();
  const dataTestSubj = fieldName;
  useEffect(() => {
    const chartData = buildChartDataFromStats(stats, METRIC_DISTRIBUTION_CHART_WIDTH);
    setDistributionChartData(chartData);
    setLegendText({ min: chartData[0].x, max: chartData[chartData.length - 1].x });
  }, []);

  return (
    <EuiFlexGroup direction={'column'}>
      <EuiFlexItem>
        <MetricDistributionChart
          width={METRIC_DISTRIBUTION_CHART_WIDTH}
          height={METRIC_DISTRIBUTION_CHART_HEIGHT}
          chartData={distributionChartData}
          fieldFormat={fieldFormat}
          hideXAxis={true}
        />
      </EuiFlexItem>
      {legendText && (
        <>
          <EuiFlexGroup direction={'row'} data-test-subj={`${dataTestSubj}-legend`}>
            <EuiFlexItem className={'mlDataGridChart__legend'}>{legendText.min}</EuiFlexItem>
            <EuiFlexItem className={'mlDataGridChart__legend'}>{legendText.max}</EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      )}
    </EuiFlexGroup>
  );
};
