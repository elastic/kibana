/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import { MetricDistributionChartData } from './metric_distribution_chart';
import { kibanaFieldFormat } from '../../../utils';

interface Props {
  chartPoint: MetricDistributionChartData | undefined;
  maxWidth: number;
  fieldFormat?: any; // Kibana formatter for field being viewed
}

export const MetricDistributionChartTooltipHeader: FC<Props> = ({
  chartPoint,
  maxWidth,
  fieldFormat,
}) => {
  if (chartPoint === undefined) {
    return null;
  }

  return (
    <div style={{ maxWidth }}>
      {chartPoint.dataMax > chartPoint.dataMin ? (
        <FormattedMessage
          id="xpack.dataVisualizer.dataGrid.field.metricDistributionChart.tooltipValueBetweenLabel"
          defaultMessage="{percent}% of documents have values between {minValFormatted} and {maxValFormatted}"
          values={{
            percent: chartPoint.percent,
            minValFormatted: kibanaFieldFormat(chartPoint.dataMin, fieldFormat),
            maxValFormatted: kibanaFieldFormat(chartPoint.dataMax, fieldFormat),
          }}
        />
      ) : (
        <FormattedMessage
          id="xpack.dataVisualizer.dataGrid.field.metricDistributionChart.tooltipValueEqualLabel"
          defaultMessage="{percent}% of documents have a value of {valFormatted}"
          values={{
            percent: chartPoint.percent,
            valFormatted: kibanaFieldFormat(chartPoint.dataMin, fieldFormat),
          }}
        />
      )}
    </div>
  );
};
