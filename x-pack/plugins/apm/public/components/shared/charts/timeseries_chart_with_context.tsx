/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AnnotationDomainType,
  LegendItemListener,
  LineAnnotation,
  Position,
  YDomainRange,
} from '@elastic/charts';
import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { asAbsoluteDateTime } from '../../../../common/utils/formatters';
import { useAnnotationsContext } from '../../../context/annotations/use_annotations_context';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { ServiceAnomalyTimeseries } from '../../../../common/anomaly_detection/service_anomaly_timeseries';
import { Coordinate, TimeSeries } from '../../../../typings/timeseries';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { unit } from '../../../utils/style';
import { getTimeZone } from './helper/timezone';
import { TimeseriesChart } from './timeseries_chart';
import { useTheme } from '../../../hooks/use_theme';

interface AnomalyTimeseries extends ServiceAnomalyTimeseries {
  color?: string;
}
export interface TimeseriesChartWithContextProps {
  id: string;
  fetchStatus: FETCH_STATUS;
  height?: number;
  onToggleLegend?: LegendItemListener;
  timeseries: Array<TimeSeries<Coordinate>>;
  /**
   * Formatter for y-axis tick values
   */
  yLabelFormat: (y: number) => string;
  /**
   * Formatter for legend and tooltip values
   */
  yTickFormat?: (y: number) => string;
  showAnnotations?: boolean;
  yDomain?: YDomainRange;
  anomalyTimeseries?: AnomalyTimeseries;
  customTheme?: Record<string, unknown>;
  anomalyTimeseriesColor?: string;
}

export function TimeseriesChartWithContext({
  id,
  height = unit * 16,
  fetchStatus,
  onToggleLegend,
  timeseries,
  yLabelFormat,
  yTickFormat,
  showAnnotations = true,
  yDomain,
  anomalyTimeseries,
  customTheme = {},
}: TimeseriesChartWithContextProps) {
  const {
    query: { comparisonEnabled, offset },
  } = useAnyOfApmParams(
    '/services',
    '/dependencies/*',
    '/services/{serviceName}'
  );
  const { core } = useApmPluginContext();
  const timeZone = getTimeZone(core.uiSettings);
  const theme = useTheme();
  const annotationColor = theme.eui.euiColorSuccess;
  const { annotations } = useAnnotationsContext();

  const timeseriesAnnotations = [
    <LineAnnotation
      key="annotations"
      id="annotations"
      domainType={AnnotationDomainType.XDomain}
      dataValues={annotations.map((annotation) => ({
        dataValue: annotation['@timestamp'],
        header: asAbsoluteDateTime(annotation['@timestamp']),
        details: `${i18n.translate('xpack.apm.chart.annotation.version', {
          defaultMessage: 'Version',
        })} ${annotation.text}`,
      }))}
      style={{
        line: { strokeWidth: 1, stroke: annotationColor, opacity: 1 },
      }}
      marker={<EuiIcon type="dot" color={annotationColor} />}
      markerPosition={Position.Top}
    />,
  ];
  return (
    <TimeseriesChart
      id={id}
      height={height}
      fetchStatus={fetchStatus}
      onToggleLegend={onToggleLegend}
      timeseries={timeseries}
      yLabelFormat={yLabelFormat}
      yTickFormat={yTickFormat}
      showAnnotations={showAnnotations}
      annotations={timeseriesAnnotations}
      yDomain={yDomain}
      anomalyTimeseries={anomalyTimeseries}
      customTheme={customTheme}
      timeZone={timeZone}
      comparisonEnabled={comparisonEnabled}
      offset={offset}
    />
  );
}
