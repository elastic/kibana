/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { rgba } from 'polished';
import { getSeverity } from '@kbn/ml-anomaly-utils/get_severity';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { ML_ANOMALY_THRESHOLD } from '@kbn/ml-anomaly-utils/anomaly_threshold';
import type { AreaSeriesStyle, RecursivePartial } from '@elastic/charts';
import type { EuiThemeComputed } from '@elastic/eui';
import { getSeverityColor, getSeverityPointStyle } from '../../../../../common/anomaly_detection';
import type { ServiceAnomalyTimeseries } from '../../../../../common/anomaly_detection/service_anomaly_timeseries';
import type { APMChartSpec } from '../../../../../typings/timeseries';

export const expectedBoundsTitle = i18n.translate('xpack.apm.comparison.expectedBoundsTitle', {
  defaultMessage: 'Expected bounds',
});
export function getChartAnomalyTimeseries({
  anomalyTimeseries,
  euiTheme,
  anomalyTimeseriesColor,
}: {
  anomalyTimeseries?: ServiceAnomalyTimeseries;
  euiTheme: EuiThemeComputed;
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
      color: anomalyTimeseriesColor ?? rgba(euiTheme.colors.vis.euiColorVis1, 0.5),
      yAccessors: ['y1'],
      y0Accessors: ['y0'],
      data: anomalyTimeseries.bounds,
      key: 'expected_bounds',
    },
  ];

  const severities = [
    {
      severity: ML_ANOMALY_SEVERITY.CRITICAL,
      threshold: ML_ANOMALY_THRESHOLD.CRITICAL,
    },
    {
      severity: ML_ANOMALY_SEVERITY.MAJOR,
      threshold: ML_ANOMALY_THRESHOLD.MAJOR,
    },
    {
      severity: ML_ANOMALY_SEVERITY.MINOR,
      threshold: ML_ANOMALY_THRESHOLD.MINOR,
    },
    {
      severity: ML_ANOMALY_SEVERITY.WARNING,
      threshold: ML_ANOMALY_THRESHOLD.WARNING,
    },
    {
      severity: ML_ANOMALY_SEVERITY.LOW,
      threshold: ML_ANOMALY_THRESHOLD.LOW,
    },
  ];

  const scores: APMChartSpec[] = severities.map(({ severity, threshold }) => {
    const color = getSeverityColor(threshold, euiTheme);

    const style: RecursivePartial<AreaSeriesStyle> = {
      line: {
        opacity: 0,
      },
      area: {
        fill: color,
      },
      point: getSeverityPointStyle(threshold, euiTheme),
    };

    const data = anomalyTimeseries.anomalies.map((anomaly) => ({
      ...anomaly,
      y: getSeverity(anomaly.y ?? 0).id === severity ? anomaly.actual : null,
    }));

    // Only show the legend for a severity when this chart actually contains an
    // anomaly of that severity, otherwise the legend would advertise (e.g.)
    // "Critical anomaly" on a chart that has none.
    const hasAnomalies = data.some(({ y }) => y !== null && y !== undefined);

    return {
      title: i18n.translate('xpack.apm.anomalyScore', {
        defaultMessage:
          '{severity, select, low {Low} warning {Warning} minor {Minor} major {Major} critical {Critical} other {Unknown severity}} anomaly',
        values: {
          severity,
        },
      }),
      type: 'line',
      lineSeriesStyle: style,
      data,
      color,
      hideLegend: !hasAnomalies,
    };
  });

  return { boundaries, scores };
}
