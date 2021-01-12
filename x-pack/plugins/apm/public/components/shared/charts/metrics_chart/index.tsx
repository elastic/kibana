/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiTitle } from '@elastic/eui';
import React from 'react';
import {
  asDecimal,
  asDuration,
  asInteger,
  asPercent,
  getFixedByteFormatter,
} from '../../../../../common/utils/formatters';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { GenericMetricsChart } from '../../../../../server/lib/metrics/transform_metrics_chart';
import { Maybe } from '../../../../../typings/common';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { TimeseriesChart } from '../timeseries_chart';

function getYTickFormatter(chart: GenericMetricsChart) {
  switch (chart.yUnit) {
    case 'bytes': {
      const max = Math.max(
        ...chart.series.map(({ data }) =>
          Math.max(...data.map(({ y }) => y || 0))
        )
      );
      return getFixedByteFormatter(max);
    }
    case 'percent': {
      return (y: Maybe<number>) => asPercent(y || 0, 1);
    }
    case 'time': {
      return asDuration;
    }
    case 'integer': {
      return asInteger;
    }
    default: {
      return asDecimal;
    }
  }
}

interface Props {
  start: Maybe<number | string>;
  end: Maybe<number | string>;
  chart: GenericMetricsChart;
  fetchStatus: FETCH_STATUS;
}

export function MetricsChart({ chart, fetchStatus }: Props) {
  return (
    <>
      <EuiTitle size="xs">
        <span>{chart.title}</span>
      </EuiTitle>
      <TimeseriesChart
        fetchStatus={fetchStatus}
        id={chart.key}
        timeseries={chart.series}
        yLabelFormat={getYTickFormatter(chart)}
      />
    </>
  );
}
