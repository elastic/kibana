/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { scaleUtc } from 'd3-scale';
import d3 from 'd3';
import React from 'react';
import { asRelativeDateTimeRange } from '../../../../utils/formatters';
import { getTimezoneOffsetInMs } from '../../../shared/charts/CustomPlot/getTimezoneOffsetInMs';
// @ts-ignore
import Histogram from '../../../shared/charts/Histogram';
import { EmptyMessage } from '../../../shared/EmptyMessage';

interface IBucket {
  key: number;
  count: number;
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
  y: number;
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
  const buckets = getFormattedBuckets(
    distribution.buckets,
    distribution.bucketSize
  );

  if (!buckets || distribution.noHits) {
    return (
      <EmptyMessage
        heading={i18n.translate('xpack.apm.errorGroupDetails.noErrorsLabel', {
          defaultMessage: 'No errors were found',
        })}
      />
    );
  }

  const xMin = d3.min(buckets, (d) => d.x0);
  const xMax = d3.max(buckets, (d) => d.x);
  const tickFormat = scaleUtc().domain([xMin, xMax]).tickFormat();

  return (
    <div>
      <EuiTitle size="xs">
        <span>{title}</span>
      </EuiTitle>
      <Histogram
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
          i18n.translate('xpack.apm.errorGroupDetails.occurrencesShortLabel', {
            defaultMessage: '{occCount} occ.',
            values: { occCount: value },
          })
        }
        formatYLong={(value: number) =>
          i18n.translate('xpack.apm.errorGroupDetails.occurrencesLongLabel', {
            defaultMessage: '{occCount} occurrences',
            values: { occCount: value },
          })
        }
      />
    </div>
  );
}
