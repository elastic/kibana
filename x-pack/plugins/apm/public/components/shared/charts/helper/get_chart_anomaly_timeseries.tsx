/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { rgba } from 'polished';
import { EuiTheme } from '@kbn/kibana-react-plugin/common';
import { getSeverity } from '@kbn/ml-plugin/public';
import { getSeverityColor } from '../../../../../common/anomaly_detection';
import {
  ANOMALY_SEVERITY,
  ANOMALY_THRESHOLD,
} from '../../../../../common/ml_constants';
import { ServiceAnomalyTimeseries } from '../../../../../common/anomaly_detection/service_anomaly_timeseries';
import { APMChartSpec } from '../../../../../typings/timeseries';

export const expectedBoundsTitle = i18n.translate(
  'xpack.apm.comparison.expectedBoundsTitle',
  {
    defaultMessage: 'Expected bounds',
  }
);
export function getChartAnomalyTimeseries({
  anomalyTimeseries,
  theme,
  anomalyTimeseriesColor,
}: {
  anomalyTimeseries?: ServiceAnomalyTimeseries;
  theme: EuiTheme;
  anomalyTimeseriesColor?: string;
}):
  | {
      boundaries: APMChartSpec[];
      scores: APMChartSpec[];
    }
  | undefined {
  if (!anomalyTimeseries) {
    return undefined;
  }

  const boundaries = [
    {
      title: expectedBoundsTitle,
      type: 'area',
      hideLegend: false,
      hideTooltipValue: true,
      areaSeriesStyle: {
        point: {
          opacity: 0,
        },
      },
      color: anomalyTimeseriesColor ?? rgba(theme.eui.euiColorVis1, 0.5),
      yAccessors: ['y1'],
      y0Accessors: ['y0'],
      data: anomalyTimeseries.bounds,
      key: 'expected_bounds',
    },
  ];

  const severities = [
    { severity: ANOMALY_SEVERITY.MAJOR, threshold: ANOMALY_THRESHOLD.MAJOR },
    {
      severity: ANOMALY_SEVERITY.CRITICAL,
      threshold: ANOMALY_THRESHOLD.CRITICAL,
    },
  ];

  const scores: APMChartSpec[] = severities.map(({ severity, threshold }) => {
    const color = getSeverityColor(threshold);

    const style = {
      line: {
        opacity: 0,
      },
      area: {
        fill: color,
      },
      point: {
        visible: true,
        opacity: 0.75,
        radius: 3,
        strokeWidth: 1,
        fill: color,
        stroke: rgba(0, 0, 0, 0.1),
      },
    };

    const data = anomalyTimeseries.anomalies.map((anomaly) => ({
      ...anomaly,
      y: getSeverity(anomaly.y ?? 0).id === severity ? anomaly.actual : null,
    }));

    return {
      title: i18n.translate('xpack.apm.anomalyScore', {
        defaultMessage:
          '{severity, select, minor {Minor} major {Major} critical {Critical}} anomaly',
        values: {
          severity,
        },
      }),
      type: 'line',
      hideLegend: true,
      lineSeriesStyle: style,
      data,
      color,
    };
  });

  return { boundaries, scores };
}
