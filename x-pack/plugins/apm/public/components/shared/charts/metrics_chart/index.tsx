/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle } from '@elastic/eui';
import React from 'react';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import {
  asDecimal,
  asInteger,
  asPercent,
  getDurationFormatter,
  getFixedByteFormatter,
} from '../../../../../common/utils/formatters';
import { Maybe } from '../../../../../typings/common';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { TimeseriesChart } from '../timeseries_chart';
import {
  getMaxY,
  getResponseTimeTickFormatter,
} from '../transaction_charts/helper';

type MetricChartApiResponse =
  APIReturnType<'GET /internal/apm/services/{serviceName}/metrics/charts'>;
type MetricChart = MetricChartApiResponse['charts'][0];

function getYTickFormatter(chart: MetricChart) {
  const max = getMaxY(chart.series);

  switch (chart.yUnit) {
    case 'bytes': {
      return getFixedByteFormatter(max);
    }
    case 'percent': {
      return (y: Maybe<number>) => asPercent(y || 0, 1);
    }
    case 'time': {
      const durationFormatter = getDurationFormatter(max);
      return getResponseTimeTickFormatter(durationFormatter);
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
  chart: MetricChart;
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
