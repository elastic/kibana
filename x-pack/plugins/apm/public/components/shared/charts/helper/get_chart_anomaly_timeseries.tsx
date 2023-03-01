/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BarSeriesStyle,
  LineSeriesStyle,
  RecursivePartial,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { EuiTheme } from '@kbn/kibana-react-plugin/common';
import { getSeverity } from '@kbn/ml-plugin/public';
import { rgba } from 'polished';
import { getSeverityColor } from '../../../../../common/anomaly_detection';
import { ApmMlJobResultWithTimeseries } from '../../../../../common/anomaly_detection/apm_ml_job_result';
import {
  ANOMALY_SEVERITY,
  ANOMALY_THRESHOLD,
} from '../../../../../common/ml_constants';
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
  anomalyTimeseries?: ApmMlJobResultWithTimeseries;
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
      type: 'area' as const,
      hideLegend: false,
      hideTooltipValue: true,
      areaSeriesStyle: {
        point: {
          opacity: 0.5,
        },
      },
      color: anomalyTimeseriesColor ?? rgba(theme.eui.euiColorVis1, 0.5),
      yAccessors: ['y1'],
      y0Accessors: ['y0'],
      data: anomalyTimeseries.bounds.timeseries,
      key: 'expected_bounds',
    },
  ];

  const severities = [
    {
      severity: ANOMALY_SEVERITY.WARNING,
      threshold: ANOMALY_THRESHOLD.WARNING,
    },
    {
      severity: ANOMALY_SEVERITY.MINOR,
      threshold: ANOMALY_THRESHOLD.MINOR,
    },
    { severity: ANOMALY_SEVERITY.MAJOR, threshold: ANOMALY_THRESHOLD.MAJOR },
    {
      severity: ANOMALY_SEVERITY.CRITICAL,
      threshold: ANOMALY_THRESHOLD.CRITICAL,
    },
  ];

  const scores: APMChartSpec[] = severities.flatMap(
    ({ severity, threshold }) => {
      const color = getSeverityColor(threshold);

      let radius = 3;

      if (severity === ANOMALY_SEVERITY.CRITICAL) {
        radius = 5;
      } else if (severity === ANOMALY_SEVERITY.MAJOR) {
        radius = 4;
      }

      const data = anomalyTimeseries.anomalies.timeseries.map((anomaly) => ({
        ...anomaly,
        y: getSeverity(anomaly.y ?? 0).id === severity ? anomaly.actual : null,
      }));

      const shared = {
        title: i18n.translate('xpack.apm.anomalyScore', {
          defaultMessage:
            '{severity, select, warning {Warning} minor {Minor} major {Major} critical {Critical}} anomaly',
          values: {
            severity,
          },
        }),
        hideLegend: true,
        data,
        color,
      };

      const barStyle: RecursivePartial<BarSeriesStyle> = {
        rect: {
          fill: color,
          opacity: 0.25,
        },
        rectBorder: {
          strokeWidth: 2,
          visible: true,
          strokeOpacity: 0.25,
        },
      };

      const lineStyle: RecursivePartial<LineSeriesStyle> = {
        line: {
          opacity: 0,
        },
        point: {
          visible: true,
          opacity: 0.75,
          radius,
          strokeWidth: 2,
          fill: color,
          shape: 'circle',
        },
      };

      return [
        {
          ...shared,
          hideTooltipValue: true,
          type: 'bar',
          barSeriesStyle: barStyle,
          id: `ml_severity_${severity}_bar`,
        },
        {
          ...shared,
          type: 'line',
          lineSeriesStyle: lineStyle,
        },
      ];
    }
  );

  return { boundaries, scores };
}
