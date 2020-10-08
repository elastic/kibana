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
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import d3 from 'd3';
import { scaleUtc } from 'd3-scale';
import { mean } from 'lodash';
import React from 'react';
import { asRelativeDateTimeRange } from '../../../../../common/utils/formatters';
import { useTheme } from '../../../../hooks/useTheme';
import { getTimezoneOffsetInMs } from '../../../shared/charts/CustomPlot/getTimezoneOffsetInMs';
// @ts-expect-error
import Histogram from '../../../shared/charts/Histogram';
import { EmptyMessage } from '../../../shared/EmptyMessage';

interface IBucket {
  key: number;
  count: number | undefined;
}

// TODO: cleanup duplication of this in distribution/get_distribution.ts (ErrorDistributionAPIResponse) and transactions/distribution/index.ts (TransactionDistributionAPIResponse)
interface IDistribution {
  noHits: boolean;
  buckets: IBucket[];
  bucketSize: number;
}

interface FormattedBucket {
  x0: number;
  x: number;
  y: number | undefined;
}

export function getFormattedBuckets(
  buckets: IBucket[],
  bucketSize: number
): FormattedBucket[] | null {
  if (!buckets) {
    return null;
  }

  return buckets.map(({ count, key }) => {
    return {
      x0: key,
      x: key + bucketSize,
      y: count,
    };
  });
}

interface Props {
  distribution: IDistribution;
  title: React.ReactNode;
}

const tooltipHeader = (bucket: FormattedBucket) =>
  asRelativeDateTimeRange(bucket.x0, bucket.x);

export function ErrorDistribution({ distribution, title }: Props) {
  const theme = useTheme();
  const buckets = getFormattedBuckets(
    distribution.buckets,
    distribution.bucketSize
  );

  if (!buckets) {
    return (
      <EmptyMessage
        heading={i18n.translate('xpack.apm.errorGroupDetails.noErrorsLabel', {
          defaultMessage: 'No errors were found',
        })}
      />
    );
  }

  const averageValue = mean(buckets.map((bucket) => bucket.y)) || 0;
  const xMin = d3.min(buckets, (d) => d.x0);
  const xMax = d3.max(buckets, (d) => d.x);
  const tickFormat = scaleUtc().domain([xMin, xMax]).tickFormat();

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
      <div>
        <Histogram
          height={180}
          noHits={distribution.noHits}
          tooltipHeader={tooltipHeader}
          verticalLineHover={(bucket: FormattedBucket) => bucket.x}
          xType="time-utc"
          formatX={(value: Date) => {
            const time = value.getTime();
            return tickFormat(new Date(time - getTimezoneOffsetInMs(time)));
          }}
          buckets={buckets}
          bucketSize={distribution.bucketSize}
          formatYShort={(value: number) =>
            i18n.translate(
              'xpack.apm.errorGroupDetails.occurrencesShortLabel',
              {
                defaultMessage: '{occCount} occ.',
                values: { occCount: value },
              }
            )
          }
          formatYLong={(value: number) =>
            i18n.translate('xpack.apm.errorGroupDetails.occurrencesLongLabel', {
              defaultMessage:
                '{occCount} {occCount, plural, one {occurrence} other {occurrences}}',
              values: { occCount: value },
            })
          }
          legends={[
            {
              color: theme.eui.euiColorVis1,
              // 0a abbreviates large whole numbers with metric prefixes like: 1000 = 1k, 32000 = 32k, 1000000 = 1m
              legendValue: numeral(averageValue).format('0a'),
              title: i18n.translate('xpack.apm.errorGroupDetails.avgLabel', {
                defaultMessage: 'Avg.',
              }),
              legendClickDisabled: true,
            },
          ]}
        />
      </div>
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
          <Axis
            id="y-axis"
            position={Position.Left}
            ticks={2}
            showGridLines
            tickFormat={(value) => `${value} occ.`}
          />
          <HistogramBarSeries
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
