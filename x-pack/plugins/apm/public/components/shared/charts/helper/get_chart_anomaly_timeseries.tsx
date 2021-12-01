/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fit } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { rgba } from 'polished';
import { EuiTheme } from '../../../../../../../../src/plugins/kibana_react/common';
import { getSeverityColor } from '../../../../../common/anomaly_detection';
import {
  ANOMALY_SEVERITY,
  ANOMALY_THRESHOLD,
} from '../../../../../common/ml_constants';
import { ServiceAnomalyTimeseries } from '../../../../../common/anomaly_detection/service_anomaly_timeseries';
import { APMChartSpec } from '../../../../../typings/timeseries';
import { getSeverity } from '../../../../../../ml/public';

export function getChartAnomalyTimeseries({
  anomalyTimeseries,
  theme,
}: {
  anomalyTimeseries?: ServiceAnomalyTimeseries;
  theme: EuiTheme;
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
      title: 'model plot',
      type: 'area',
      fit: Fit.Lookahead,
      hideLegend: true,
      hideTooltipValue: true,
      areaSeriesStyle: {
        point: {
          opacity: 0,
        },
      },
      color: rgba(theme.eui.euiColorVis1, 0.5),
      stackAccessors: ['x'],
      yAccessors: ['y0'],
      y0Accessors: ['y1'],
      data: anomalyTimeseries.bounds,
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
