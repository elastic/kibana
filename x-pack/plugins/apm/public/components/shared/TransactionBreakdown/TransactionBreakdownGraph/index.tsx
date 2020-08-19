/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { throttle, isEmpty } from 'lodash';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { Coordinate, TimeSeries } from '../../../../../typings/timeseries';
import { Maybe } from '../../../../../typings/common';
import { TransactionLineChart } from '../../charts/TransactionCharts/TransactionLineChart';
import { asPercent } from '../../../../utils/formatters';
import { unit } from '../../../../style/variables';
import { isValidCoordinateValue } from '../../../../utils/isValidCoordinateValue';
import { useUiTracker } from '../../../../../../observability/public';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { getEmptySeries } from '../../charts/CustomPlot/getEmptySeries';

interface Props {
  timeseries: TimeSeries[];
}

const tickFormatY = (y: Maybe<number>) => {
  return asPercent(y ?? 0, 1);
};

const formatTooltipValue = (coordinate: Coordinate) => {
  return isValidCoordinateValue(coordinate.y)
    ? asPercent(coordinate.y, 1)
    : NOT_AVAILABLE_LABEL;
};

function TransactionBreakdownGraph(props: Props) {
  const { urlParams } = useUrlParams();
  const { rangeFrom, rangeTo } = urlParams;
  const { timeseries } = props;
  const trackApmEvent = useUiTracker({ app: 'apm' });
  const handleHover = useMemo(
    () =>
      throttle(() => trackApmEvent({ metric: 'hover_breakdown_chart' }), 60000),
    [trackApmEvent]
  );

  const isTimeseriesEmpty = isEmpty(timeseries);
  const chartHeight = isTimeseriesEmpty ? undefined : unit * 12;
  const emptySeries =
    rangeFrom && rangeTo
      ? getEmptySeries(
          new Date(rangeFrom).valueOf(),
          new Date(rangeTo).valueOf()
        )
      : [];

  return (
    <TransactionLineChart
      series={isTimeseriesEmpty ? emptySeries : timeseries}
      tickFormatY={tickFormatY}
      formatTooltipValue={formatTooltipValue}
      yMax={1}
      height={chartHeight}
      stacked={true}
      onHover={handleHover}
    />
  );
}

export { TransactionBreakdownGraph };
