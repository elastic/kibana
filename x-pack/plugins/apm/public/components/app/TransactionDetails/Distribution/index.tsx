/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIconTip, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import d3 from 'd3';
import React, { FunctionComponent, useEffect, useCallback } from 'react';
import { omit } from 'lodash';
import { ITransactionDistributionAPIResponse } from '../../../../../server/lib/transactions/distribution';
import { IBucket } from '../../../../../server/lib/transactions/distribution/get_buckets/transform';
import { IUrlParams } from '../../../../context/UrlParamsContext/types';
import { getTimeFormatter, timeUnit } from '../../../../utils/formatters';
// @ts-ignore
import Histogram from '../../../shared/charts/Histogram';
import { EmptyMessage } from '../../../shared/EmptyMessage';
import { fromQuery, toQuery } from '../../../shared/Links/url_helpers';
import { history } from '../../../../utils/history';

interface IChartPoint {
  sample?: IBucket['sample'];
  x0: number;
  x: number;
  y: number;
  style: {
    cursor: string;
  };
}

export function getFormattedBuckets(buckets: IBucket[], bucketSize: number) {
  if (!buckets) {
    return [];
  }

  return buckets.map(
    ({ sample, count, key }): IChartPoint => {
      return {
        sample,
        x0: key,
        x: key + bucketSize,
        y: count,
        style: { cursor: count > 0 && sample ? 'pointer' : 'default' }
      };
    }
  );
}

const getFormatYShort = (transactionType: string | undefined) => (
  t: number
) => {
  return i18n.translate(
    'xpack.apm.transactionDetails.transactionsDurationDistributionChart.unitShortLabel',
    {
      defaultMessage:
        '{transCount} {transType, select, request {req.} other {trans.}}',
      values: {
        transCount: t,
        transType: transactionType
      }
    }
  );
};

const getFormatYLong = (transactionType: string | undefined) => (t: number) => {
  return transactionType === 'request'
    ? i18n.translate(
        'xpack.apm.transactionDetails.transactionsDurationDistributionChart.requestTypeUnitLongLabel',
        {
          defaultMessage:
            '{transCount, plural, =0 {# request} one {# request} other {# requests}}',
          values: {
            transCount: t
          }
        }
      )
    : i18n.translate(
        'xpack.apm.transactionDetails.transactionsDurationDistributionChart.transactionTypeUnitLongLabel',
        {
          defaultMessage:
            '{transCount, plural, =0 {# transaction} one {# transaction} other {# transactions}}',
          values: {
            transCount: t
          }
        }
      );
};

interface Props {
  distribution?: ITransactionDistributionAPIResponse;
  urlParams: IUrlParams;
}

export const TransactionDistribution: FunctionComponent<Props> = (
  props: Props
) => {
  const {
    distribution,
    urlParams: { transactionId, traceId, transactionType }
  } = props;

  const formatYShort = useCallback(getFormatYShort(transactionType), [
    transactionType
  ]);

  const formatYLong = useCallback(getFormatYLong(transactionType), [
    transactionType
  ]);

  const redirectToDefaultSample = useCallback(
    () => {
      const defaultSample =
        distribution && distribution.defaultSample
          ? distribution.defaultSample
          : {};

      const parsedQueryParams = toQuery(history.location.search);

      history.replace({
        ...history.location,
        search: fromQuery({
          ...omit(parsedQueryParams, 'transactionId', 'traceId'),
          ...defaultSample
        })
      });
    },
    [distribution]
  );

  useEffect(
    () => {
      const selectedSampleIsAvailable = distribution
        ? !!distribution.buckets.find(
            bucket =>
              !!(
                bucket.sample &&
                bucket.sample.transactionId === transactionId &&
                bucket.sample.traceId === traceId
              )
          )
        : false;

      if (!selectedSampleIsAvailable && !!distribution) {
        redirectToDefaultSample();
      }
    },
    [distribution, transactionId, traceId, redirectToDefaultSample]
  );

  if (!distribution || !distribution.totalHits || !traceId || !transactionId) {
    return (
      <EmptyMessage
        heading={i18n.translate('xpack.apm.transactionDetails.notFoundLabel', {
          defaultMessage: 'No transactions were found.'
        })}
      />
    );
  }

  const buckets = getFormattedBuckets(
    distribution.buckets,
    distribution.bucketSize
  );

  const xMax = d3.max(buckets, d => d.x) || 0;
  const timeFormatter = getTimeFormatter(xMax);
  const unit = timeUnit(xMax);

  const bucketIndex = buckets.findIndex(
    bucket =>
      bucket.sample != null &&
      bucket.sample.transactionId === transactionId &&
      bucket.sample.traceId === traceId
  );

  return (
    <div>
      <EuiTitle size="xs">
        <h5>
          {i18n.translate(
            'xpack.apm.transactionDetails.transactionsDurationDistributionChartTitle',
            {
              defaultMessage: 'Transactions duration distribution'
            }
          )}{' '}
          <EuiIconTip
            title={i18n.translate(
              'xpack.apm.transactionDetails.transactionsDurationDistributionChartTooltip.samplingLabel',
              {
                defaultMessage: 'Sampling'
              }
            )}
            content={i18n.translate(
              'xpack.apm.transactionDetails.transactionsDurationDistributionChartTooltip.samplingDescription',
              {
                defaultMessage:
                  "Each bucket will show a sample transaction. If there's no sample available, it's most likely because of the sampling limit set in the agent configuration."
              }
            )}
            position="top"
          />
        </h5>
      </EuiTitle>

      <Histogram
        buckets={buckets}
        bucketSize={distribution.bucketSize}
        bucketIndex={bucketIndex}
        onClick={(bucket: IChartPoint) => {
          if (bucket.sample && bucket.y > 0) {
            history.push({
              ...history.location,
              search: fromQuery({
                ...toQuery(history.location.search),
                transactionId: bucket.sample.transactionId,
                traceId: bucket.sample.traceId
              })
            });
          }
        }}
        formatX={timeFormatter}
        formatYShort={formatYShort}
        formatYLong={formatYLong}
        verticalLineHover={(bucket: IChartPoint) =>
          bucket.y > 0 && !bucket.sample
        }
        backgroundHover={(bucket: IChartPoint) => bucket.y > 0 && bucket.sample}
        tooltipHeader={(bucket: IChartPoint) =>
          `${timeFormatter(bucket.x0, { withUnit: false })} - ${timeFormatter(
            bucket.x,
            { withUnit: false }
          )} ${unit}`
        }
        tooltipFooter={(bucket: IChartPoint) =>
          !bucket.sample &&
          i18n.translate(
            'xpack.apm.transactionDetails.transactionsDurationDistributionChart.noSampleTooltip',
            {
              defaultMessage: 'No sample available for this bucket'
            }
          )
        }
      />
    </div>
  );
};
