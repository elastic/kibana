/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Axis,
  Chart,
  ElementClickListener,
  GeometryValue,
  HistogramBarSeries,
  Position,
  RectAnnotation,
  ScaleType,
  Settings,
  SettingsSpec,
  TooltipValue,
  XYChartSeriesIdentifier,
} from '@elastic/charts';
import { EuiIconTip, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import d3 from 'd3';
import { isEmpty } from 'lodash';
import React from 'react';
import { ValuesType } from 'utility-types';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { useTheme } from '../../../../../../observability/public';
import { getDurationFormatter } from '../../../../../common/utils/formatters';
import type { IUrlParams } from '../../../../context/url_params_context/types';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { unit } from '../../../../style/variables';
import { ChartContainer } from '../../../shared/charts/chart_container';
import { EmptyMessage } from '../../../shared/EmptyMessage';

type TransactionDistributionAPIResponse = APIReturnType<'GET /api/apm/services/{serviceName}/transaction_groups/distribution'>;

type DistributionApiResponse = APIReturnType<'GET /api/apm/services/{serviceName}/transaction_groups/distribution'>;

type DistributionBucket = DistributionApiResponse['buckets'][0];

interface IChartPoint {
  x0: number;
  x: number;
  y: number;
  style: {
    cursor: string;
  };
}

export function getFormattedBuckets(
  buckets?: DistributionBucket[],
  bucketSize?: number
) {
  if (!buckets || !bucketSize) {
    return [];
  }

  return buckets.map(
    ({ samples, count, key }): IChartPoint => {
      return {
        x0: key,
        x: key + bucketSize,
        y: count,
        style: {
          cursor: isEmpty(samples) ? 'default' : 'pointer',
        },
      };
    }
  );
}

const formatYShort = (t: number) => {
  return i18n.translate(
    'xpack.apm.transactionDetails.transactionsDurationDistributionChart.unitShortLabel',
    {
      defaultMessage: '{transCount} trans.',
      values: { transCount: t },
    }
  );
};

const formatYLong = (t: number) => {
  return i18n.translate(
    'xpack.apm.transactionDetails.transactionsDurationDistributionChart.transactionTypeUnitLongLabel',
    {
      defaultMessage:
        '{transCount, plural, =0 {transactions} one {transaction} other {transactions}}',
      values: {
        transCount: t,
      },
    }
  );
};

interface Props {
  distribution?: TransactionDistributionAPIResponse;
  urlParams: IUrlParams;
  fetchStatus: FETCH_STATUS;
  bucketIndex: number;
  onBucketClick: (
    bucket: ValuesType<TransactionDistributionAPIResponse['buckets']>
  ) => void;
}

export function TransactionDistribution({
  distribution,
  urlParams: { transactionType },
  fetchStatus,
  bucketIndex,
  onBucketClick,
}: Props) {
  const theme = useTheme();

  // no data in response
  if (
    (!distribution || distribution.noHits) &&
    fetchStatus !== FETCH_STATUS.LOADING
  ) {
    return (
      <EmptyMessage
        heading={i18n.translate('xpack.apm.transactionDetails.notFoundLabel', {
          defaultMessage: 'No transactions were found.',
        })}
      />
    );
  }

  const buckets = getFormattedBuckets(
    distribution?.buckets,
    distribution?.bucketSize
  );

  const xMin = d3.min(buckets, (d) => d.x0) || 0;
  const xMax = d3.max(buckets, (d) => d.x0) || 0;
  const timeFormatter = getDurationFormatter(xMax);

  const tooltipProps: SettingsSpec['tooltip'] = {
    headerFormatter: (tooltip: TooltipValue) => {
      const serie = buckets.find((bucket) => bucket.x0 === tooltip.value);
      if (serie) {
        const xFormatted = timeFormatter(serie.x);
        const x0Formatted = timeFormatter(serie.x0);
        return `${x0Formatted.value} - ${xFormatted.value} ${xFormatted.unit}`;
      }
      return `${timeFormatter(tooltip.value)}`;
    },
  };

  const onBarClick: ElementClickListener = (elements) => {
    const chartPoint = elements[0][0] as GeometryValue;
    const clickedBucket = distribution?.buckets.find((bucket) => {
      return bucket.key === chartPoint.x;
    });
    if (clickedBucket) {
      onBucketClick(clickedBucket);
    }
  };

  const selectedBucket = buckets[bucketIndex];

  return (
    <div>
      <EuiTitle size="xs">
        <h5>
          {i18n.translate(
            'xpack.apm.transactionDetails.transactionsDurationDistributionChartTitle',
            {
              defaultMessage: 'Transactions duration distribution',
            }
          )}{' '}
          <EuiIconTip
            title={i18n.translate(
              'xpack.apm.transactionDetails.transactionsDurationDistributionChartTooltip.samplingLabel',
              {
                defaultMessage: 'Sampling',
              }
            )}
            content={i18n.translate(
              'xpack.apm.transactionDetails.transactionsDurationDistributionChartTooltip.samplingDescription',
              {
                defaultMessage:
                  "Each bucket will show a sample transaction. If there's no sample available, it's most likely because of the sampling limit set in the agent configuration.",
              }
            )}
            position="top"
          />
        </h5>
      </EuiTitle>
      <ChartContainer
        height={unit * 10}
        hasData={!!(distribution && !distribution.noHits)}
        status={fetchStatus}
      >
        <Chart>
          <Settings
            xDomain={{ min: xMin, max: xMax }}
            tooltip={tooltipProps}
            onElementClick={onBarClick}
          />
          {selectedBucket && (
            <RectAnnotation
              id="highlighted_bucket"
              dataValues={[
                {
                  coordinates: { x0: selectedBucket.x0, x1: selectedBucket.x },
                },
              ]}
              style={{
                fill: 'transparent',
                strokeWidth: 1,
                stroke: theme.eui.euiColorVis1,
                opacity: 1,
              }}
            />
          )}
          <Axis
            id="x-axis"
            position={Position.Bottom}
            showOverlappingTicks
            tickFormat={(time: number) => timeFormatter(time).formatted}
          />
          <Axis
            id="y-axis"
            position={Position.Left}
            ticks={3}
            gridLine={{ visible: true }}
            tickFormat={(value: number) => formatYShort(value)}
          />
          <HistogramBarSeries
            tickFormat={(value: string) => value}
            minBarHeight={2}
            id="transactionDurationDistribution"
            name={(series: XYChartSeriesIdentifier) => {
              const bucketCount = series.splitAccessors.get(
                series.yAccessor
              ) as number;
              return formatYLong(bucketCount);
            }}
            splitSeriesAccessors={['y']}
            xScaleType={ScaleType.Linear}
            yScaleType={ScaleType.Linear}
            xAccessor="x0"
            yAccessors={['y']}
            data={buckets}
            color={theme.eui.euiColorVis1}
          />
        </Chart>
      </ChartContainer>
    </div>
  );
}
