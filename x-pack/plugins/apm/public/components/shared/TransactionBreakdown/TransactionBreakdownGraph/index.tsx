/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { throttle } from 'lodash';
import React, { useMemo } from 'react';
import { asPercent } from '../../../../../common/utils/formatters';
import { useUiTracker } from '../../../../../../observability/public';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { Maybe } from '../../../../../typings/common';
import { Coordinate, TimeSeries } from '../../../../../typings/timeseries';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { isValidCoordinateValue } from '../../../../utils/isValidCoordinateValue';
import { getEmptySeries } from '../../charts/CustomPlot/getEmptySeries';
import { TransactionLineChart } from '../../charts/TransactionCharts/TransactionLineChart';

interface Props {
  timeseries: TimeSeries[];
  noHits: boolean;
}

const tickFormatY = (y: Maybe<number>) => {
  return asPercent(y ?? 0, 1);
};

const formatTooltipValue = (coordinate: Coordinate) => {
  return isValidCoordinateValue(coordinate.y)
    ? asPercent(coordinate.y, 1)
    : NOT_AVAILABLE_LABEL;
};

function TransactionBreakdownGraph({ timeseries, noHits }: Props) {
  const { urlParams } = useUrlParams();
  const { rangeFrom, rangeTo } = urlParams;
  const trackApmEvent = useUiTracker({ app: 'apm' });
  const handleHover = useMemo(
    () =>
      throttle(() => trackApmEvent({ metric: 'hover_breakdown_chart' }), 60000),
    [trackApmEvent]
  );

  const emptySeries =
    rangeFrom && rangeTo
      ? getEmptySeries(
          new Date(rangeFrom).getTime(),
          new Date(rangeTo).getTime()
        )
      : [];

  return (
    <TransactionLineChart
      series={noHits ? emptySeries : timeseries}
      tickFormatY={tickFormatY}
      formatTooltipValue={formatTooltipValue}
      yMax={1}
      stacked={true}
      onHover={handleHover}
      visibleLegendCount={10}
    />
  );
}

export { TransactionBreakdownGraph };
