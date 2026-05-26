/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  AnnotationDomainType,
  Axis,
  Chart,
  LineSeries,
  LineAnnotation,
  RectAnnotation,
  Position,
  ScaleType,
  Settings,
  niceTimeFormatter,
} from '@elastic/charts';
import { EuiPanel, EuiTitle, EuiSpacer } from '@elastic/eui';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import { i18n } from '@kbn/i18n';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import {
  APM_TIMESERIES_ATTACHMENT_TYPE,
  type ApmTimeseriesAttachmentData,
} from '../../../common/agent_builder/attachments';

type ApmTimeseriesAttachment = Attachment<
  typeof APM_TIMESERIES_ATTACHMENT_TYPE,
  ApmTimeseriesAttachmentData
>;

function yTickFormatter(unit: 'ms' | '%' | 'rpm') {
  return (value: number) => {
    if (unit === 'ms') return `${Math.round(value)}ms`;
    if (unit === '%') return `${value.toFixed(1)}%`;
    return `${value.toFixed(1)} rpm`;
  };
}

function metricLabel(metric: ApmTimeseriesAttachmentData['metric']): string {
  if (metric === 'latency') return 'Avg Latency';
  if (metric === 'failedTransactionRate') return 'Failed Transaction Rate';
  return 'Throughput';
}

function ApmTimeseriesChart({ data }: { data: ApmTimeseriesAttachmentData }) {
  const baseTheme = useElasticChartsTheme();
  const { dataPoints, metric, unit, alertThreshold, alertStart, serviceName, title } = data;

  const chartData = useMemo(
    () =>
      dataPoints
        .filter((p) => p.value != null)
        .map((p) => ({ x: p.timestamp, y: p.value as number })),
    [dataPoints]
  );

  const timestamps = dataPoints.map((p) => p.timestamp);
  const xMin = Math.min(...timestamps);
  const xMax = Math.max(...timestamps);
  const dateFormatter = useMemo(() => niceTimeFormatter([xMin, xMax]), [xMin, xMax]);

  const values = chartData.map((p) => p.y);
  const yMin = Math.min(...values, alertThreshold ?? Infinity);
  const yMax = Math.max(...values, alertThreshold ?? -Infinity);
  const yPad = (yMax - yMin) * 0.1 || 1;
  const chartDomain = { min: Math.max(0, yMin - yPad), max: yMax + yPad };

  const defaultTitle =
    title ??
    i18n.translate('xpack.apm.agentBuilder.attachments.apmTimeseries.defaultTitle', {
      defaultMessage: '{metric} over time — {serviceName}',
      values: { metric: metricLabel(metric), serviceName },
    });

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiTitle size="xs">
        <h4>{defaultTitle}</h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <Chart size={{ height: 200 }}>
        <Settings
          showLegend={false}
          locale={i18n.getLocale()}
          baseTheme={baseTheme}
        />
        <Axis
          id="x"
          position={Position.Bottom}
          tickFormat={dateFormatter}
          showOverlappingTicks
        />
        <Axis
          id="y"
          position={Position.Left}
          tickFormat={yTickFormatter(unit)}
          ticks={5}
          domain={chartDomain}
        />
        <LineSeries
          id="metric"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={chartData}
        />
        {alertThreshold != null && (
          <LineAnnotation
            id="threshold"
            domainType={AnnotationDomainType.YDomain}
            dataValues={[{ dataValue: alertThreshold, details: `Threshold: ${yTickFormatter(unit)(alertThreshold)}` }]}
            style={{
              line: { strokeWidth: 2, stroke: '#BD271E', opacity: 1 },
            }}
          />
        )}
        {alertStart != null && (
          <RectAnnotation
            id="alert_start"
            dataValues={[{ coordinates: { x0: alertStart, x1: xMax } }]}
            style={{ fill: '#BD271E', opacity: 0.07 }}
            hideTooltips
          />
        )}
      </Chart>
    </EuiPanel>
  );
}

export const registerApmTimeseriesAttachment = (attachments: AttachmentServiceStartContract) => {
  attachments.addAttachmentType<ApmTimeseriesAttachment>(APM_TIMESERIES_ATTACHMENT_TYPE, {
    getLabel: (attachment) =>
      attachment.data?.title ??
      i18n.translate('xpack.apm.agentBuilder.attachments.apmTimeseries.label', {
        defaultMessage: 'APM Timeseries',
      }),
    getIcon: () => 'visLine',
    renderInlineContent: ({ attachment }) => {
      return <ApmTimeseriesChart data={attachment.data} />;
    },
  });
};
