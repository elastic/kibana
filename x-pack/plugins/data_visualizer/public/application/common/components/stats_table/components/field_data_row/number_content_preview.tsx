/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import classNames from 'classnames';
import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import { formatSingleValue } from '../../../utils/format_value';
import { kibanaFieldFormat } from '../../../utils/kibana_field_format';
import type { FieldVisConfig } from '../../types/field_vis_config';
import type { MetricDistributionChartData } from '../metric_distribution_chart/metric_distribution_chart';
import { MetricDistributionChart } from '../metric_distribution_chart/metric_distribution_chart';
import { buildChartDataFromStats } from '../metric_distribution_chart/metric_distribution_chart_data_builder';

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
  const dataTestSubj = `dataVisualizerDataGridChart-${fieldName}`;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div data-test-subj={dataTestSubj}>
      <div className="dataGridChart__histogram" data-test-subj={`${dataTestSubj}-histogram`}>
        <MetricDistributionChart
          width={METRIC_DISTRIBUTION_CHART_WIDTH}
          height={METRIC_DISTRIBUTION_CHART_HEIGHT}
          chartData={distributionChartData}
          fieldFormat={fieldFormat}
          hideXAxis={true}
        />
      </div>
      <div className={'dataGridChart__legend'} data-test-subj={`${dataTestSubj}-legend`}>
        {legendText && (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup direction={'row'} data-test-subj={`${dataTestSubj}-legend`}>
              <EuiFlexItem className={'dataGridChart__legend'}>
                {kibanaFieldFormat(legendText.min, fieldFormat)}
              </EuiFlexItem>
              <EuiFlexItem
                className={classNames('dataGridChart__legend', 'dataGridChart__legend--numeric')}
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
