/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  Chart,
  HistogramBarSeries,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
  SettingsSpec,
  TooltipValue,
} from '@elastic/charts';
import { EuiTitle } from '@elastic/eui';
import d3 from 'd3';
import React from 'react';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { asRelativeDateTimeRange } from '../../../../../common/utils/formatters';
import { useTheme } from '../../../../hooks/useTheme';

type ErrorDistributionAPIResponse = APIReturnType<'GET /api/apm/services/{serviceName}/errors/distribution'>;

interface FormattedBucket {
  x0: number;
  x: number;
  y: number | undefined;
}

export function getFormattedBuckets(
  buckets: ErrorDistributionAPIResponse['buckets'],
  bucketSize: number
): FormattedBucket[] {
  return buckets.map(({ count, key }) => {
    return {
      x0: key,
      x: key + bucketSize,
      y: count,
    };
  });
}

interface Props {
  distribution: ErrorDistributionAPIResponse;
  title: React.ReactNode;
}

export function ErrorDistribution({ distribution, title }: Props) {
  const theme = useTheme();
  const buckets = getFormattedBuckets(
    distribution.buckets,
    distribution.bucketSize
  );

  const xMin = d3.min(buckets, (d) => d.x0);
  const xMax = d3.max(buckets, (d) => d.x0);

  const xFormatter = niceTimeFormatter([xMin, xMax]);

  const tooltipProps: SettingsSpec['tooltip'] = {
    headerFormatter: (tooltip: TooltipValue) => {
      const serie = buckets.find((bucket) => bucket.x0 === tooltip.value);
      if (serie) {
        return asRelativeDateTimeRange(serie.x0, serie.x);
      }
      return `${tooltip.value}`;
    },
  };

  return (
    <div>
      <EuiTitle size="xs">
        <span>{title}</span>
      </EuiTitle>
      <div style={{ height: 180 }}>
        <Chart>
          <Settings
            xDomain={{ min: xMin, max: xMax }}
            tooltip={tooltipProps}
            showLegend
            showLegendExtra
            legendPosition={Position.Bottom}
          />
          <Axis
            id="x-axis"
            position={Position.Bottom}
            showOverlappingTicks
            tickFormat={xFormatter}
          />
          <Axis id="y-axis" position={Position.Left} ticks={2} showGridLines />
          <HistogramBarSeries
            minBarHeight={2}
            id="errorOccurrences"
            name="Occurences"
            xScaleType={ScaleType.Linear}
            yScaleType={ScaleType.Linear}
            xAccessor="x0"
            yAccessors={['y']}
            data={buckets}
            color={theme.eui.euiColorVis1}
          />
        </Chart>
      </div>
    </div>
  );
}
