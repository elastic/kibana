/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Axis,
  Chart,
  HistogramBarSeries,
  Position,
  ProjectionClickListener,
  RectAnnotation,
  ScaleType,
  Settings,
  SettingsSpec,
  TooltipInfo,
  XYChartSeriesIdentifier,
} from '@elastic/charts';
import { EuiIconTip, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import d3 from 'd3';
import { isEmpty, keyBy } from 'lodash';
import React from 'react';
import { ValuesType } from 'utility-types';
import { getDurationFormatter } from '../../../../../common/utils/formatters';
import type { IUrlParams } from '../../../../context/url_params_context/types';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useTheme } from '../../../../hooks/use_theme';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { unit } from '../../../../utils/style';
import { ChartContainer } from '../../../shared/charts/chart_container';
import { EmptyMessage } from '../../../shared/EmptyMessage';
import { CustomTooltip } from './custom_tooltip';

type TransactionDistributionAPIResponse = APIReturnType<'GET /api/apm/services/{serviceName}/transactions/charts/distribution'>;

type DistributionBucket = TransactionDistributionAPIResponse['buckets'][0];

export interface IChartPoint {
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

export const formatYLong = (t: number) => {
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

  const distributionMap = keyBy(distribution?.buckets, 'key');
  const bucketsMap = keyBy(buckets, 'x0');

  const tooltip: SettingsSpec['tooltip'] = {
    customTooltip: (props: TooltipInfo) => {
      const datum = props.header?.datum as IChartPoint;
      const selectedDistribution = distributionMap[datum?.x0];
      const serie = bucketsMap[datum?.x0];
      return (
        <CustomTooltip
          {...props}
          isSamplesEmpty={isEmpty(selectedDistribution?.samples)}
          serie={serie}
          timeFormatter={timeFormatter}
        />
      );
    },
  };

  const onBarClick: ProjectionClickListener = ({ x }) => {
    const clickedBucket = distribution?.buckets.find((bucket) => {
      return bucket.key === x;
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
              defaultMessage: 'Latency distribution',
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
            tooltip={tooltip}
            onProjectionClick={onBarClick}
          />
          {selectedBucket && (
            <RectAnnotation
              zIndex={-1}
              id="highlighted_bucket"
              dataValues={[
                {
                  coordinates: { x0: selectedBucket.x0, x1: selectedBucket.x },
                },
              ]}
              style={{
                fill: 'transparent',
                strokeWidth: 1,
                stroke: theme.eui.euiColorPrimary,
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
