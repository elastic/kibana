/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import {
  Coordinate,
  RectCoordinate,
} from '../../../../../../typings/timeseries';
import { useChartsSync } from '../../../../../hooks/useChartsSync';
// @ts-ignore
import CustomPlot from '../../CustomPlot';

interface Props {
  series: Array<{
    color: string;
    title: React.ReactNode;
    titleShort?: React.ReactNode;
    data: Array<Coordinate | RectCoordinate>;
    type: string;
  }>;
  truncateLegends?: boolean;
  tickFormatY: (y: number) => React.ReactNode;
  formatTooltipValue: (c: Coordinate) => React.ReactNode;
  yMax?: string | number;
  height?: number;
  stacked?: boolean;
  onHover?: () => void;
}

const TransactionLineChart: React.FC<Props> = (props: Props) => {
  const {
    series,
    tickFormatY,
    formatTooltipValue,
    yMax = 'max',
    height,
    truncateLegends,
    stacked = false,
    onHover,
  } = props;

  const syncedChartsProps = useChartsSync();

  // combine callback for syncedChartsProps.onHover and props.onHover
  const combinedOnHover = useCallback(
    (hoverX: number) => {
      if (onHover) {
        onHover();
      }
      return syncedChartsProps.onHover(hoverX);
    },
    [syncedChartsProps, onHover]
  );

  return (
    <CustomPlot
      series={series}
      {...syncedChartsProps}
      onHover={combinedOnHover}
      tickFormatY={tickFormatY}
      formatTooltipValue={formatTooltipValue}
      yMax={yMax}
      height={height}
      truncateLegends={truncateLegends}
      {...(stacked ? { stackBy: 'y' } : {})}
    />
  );
};

export { TransactionLineChart };
