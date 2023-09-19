/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiIcon } from '@elastic/eui';
import { Chart, Metric, MetricTrendShape } from '@elastic/charts';
import numeral from '@elastic/numeral';
import { NOT_AVAILABLE_LABEL } from '../../../common/i18n';
import { useKibana } from '../../utils/kibana_react';

import { EmbeddableSloProps } from './types';

export function SloOverview({ slo }: EmbeddableSloProps) {
  console.log(slo, '!!sloooo');
  const { uiSettings } = useKibana().services;

  const percentFormat = uiSettings.get('format:percent:defaultPattern');

  const getIcon = useCallback(
    (type: string) =>
      ({ width = 20, height = 20, color }: { width: number; height: number; color: string }) => {
        return <EuiIcon type={type} width={width} height={height} fill={color} />;
      },
    []
  );
  // const valueFormatter = (value: number, suffix = '') => {
  //   return `${value} ${suffix}`;
  // };

  const color =
    slo.summary.status === 'NO_DATA'
      ? '#f8e9e9'
      : slo.summary.status !== 'HEALTHY'
      ? '#f8e9e9' // #f8e9e9 (danger), #e6f9f7
      : '#e6f9f7';

  const extra = `Target ${numeral(slo.objective.target).format(percentFormat)}`;
  const metricData = [
    {
      color,
      title: slo.name,
      subtitle: slo.groupBy !== '*' ? `${slo.groupBy}:${slo.instanceId}` : '',
      icon: getIcon('visGauge'),
      value:
        slo.summary.status === 'NO_DATA'
          ? NOT_AVAILABLE_LABEL
          : numeral(Number.parseFloat(slo.summary.sliValue.toString())).format(percentFormat),
      valueFormatter: (value: number) => `${value}%`,
      extra,
      trend: [],
      trendShape: MetricTrendShape.Area,
    },
  ];
  return (
    <Chart>
      <Metric id="1" data={[metricData]} />
    </Chart>
  );
}
