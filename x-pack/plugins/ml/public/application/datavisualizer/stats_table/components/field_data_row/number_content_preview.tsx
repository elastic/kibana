/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import classNames from 'classnames';
import {
  MetricDistributionChart,
  MetricDistributionChartData,
  buildChartDataFromStats,
} from '../metric_distribution_chart';
import { formatSingleValue } from '../../../../formatters/format_value';
import { FieldVisConfig } from '../../types';
import { kibanaFieldFormat } from '../../../../formatters/kibana_field_format';

const METRIC_DISTRIBUTION_CHART_WIDTH = 150;
const METRIC_DISTRIBUTION_CHART_HEIGHT = 80;

export interface NumberContentPreviewProps {
  config: FieldVisConfig;
}

export const IndexBasedNumberContentPreview: FC<NumberContentPreviewProps> = ({ config }) => {
  const { stats, fieldFormat, fieldName } = config;
  const defaultChartData: MetricDistributionChartData[] = [];
  const [distributionChartData, setDistributionChartData] = useState(defaultChartData);
  const [legendText, setLegendText] = useState<{ min: number; max: number } | undefined>();
  const dataTestSubj = `mlDataGridChart-${fieldName}`;
  useEffect(() => {
    const chartData = buildChartDataFromStats(stats, METRIC_DISTRIBUTION_CHART_WIDTH);
    if (
      Array.isArray(chartData) &&
      chartData[0].x !== undefined &&
      chartData[chartData.length - 1].x !== undefined
    ) {
      setDistributionChartData(chartData);
      setLegendText({
        min: formatSingleValue(chartData[0].x),
        max: formatSingleValue(chartData[chartData.length - 1].x),
      });
    }
  }, []);

  return (
    <div data-test-subj={dataTestSubj}>
      <div className="mlDataGridChart__histogram" data-test-subj={`${dataTestSubj}-histogram`}>
        <MetricDistributionChart
          width={METRIC_DISTRIBUTION_CHART_WIDTH}
          height={METRIC_DISTRIBUTION_CHART_HEIGHT}
          chartData={distributionChartData}
          fieldFormat={fieldFormat}
          hideXAxis={true}
        />
      </div>
      <div className={'mlDataGridChart__legend'} data-test-subj={`${dataTestSubj}-legend`}>
        {legendText && (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup direction={'row'} data-test-subj={`${dataTestSubj}-legend`}>
              <EuiFlexItem className={'mlDataGridChart__legend'}>
                {kibanaFieldFormat(legendText.min, fieldFormat)}
              </EuiFlexItem>
              <EuiFlexItem
                className={classNames(
                  'mlDataGridChart__legend',
                  'mlDataGridChart__legend--numeric'
                )}
              >
                {kibanaFieldFormat(legendText.max, fieldFormat)}
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </div>
    </div>
  );
};
