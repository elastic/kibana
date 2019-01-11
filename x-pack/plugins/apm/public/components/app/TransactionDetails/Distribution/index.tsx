/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiText, EuiTitle, EuiToolTip } from '@elastic/eui';
import d3 from 'd3';
import { Location } from 'history';
import React, { Component } from 'react';
import {
  fromQuery,
  history,
  toQuery
} from 'x-pack/plugins/apm/public/components/shared/Links/url_helpers';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { ITransactionDistributionAPIResponse } from 'x-pack/plugins/apm/server/lib/transactions/distribution';
import { IBucket } from 'x-pack/plugins/apm/server/lib/transactions/distribution/get_buckets/transform';
import { getTimeFormatter, timeUnit } from '../../../../utils/formatters';
// @ts-ignore
import Histogram from '../../../shared/charts/Histogram';
import { EmptyMessage } from '../../../shared/EmptyMessage';

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

interface Props {
  location: Location;
  distribution: ITransactionDistributionAPIResponse;
  urlParams: IUrlParams;
}

export class Distribution extends Component<Props> {
  public formatYShort = (t: number) => {
    return `${t} ${unitShort(this.props.urlParams.transactionType)}`;
  };

  public formatYLong = (t: number) => {
    return `${t} ${unitLong(this.props.urlParams.transactionType, t)}`;
  };

  public render() {
    const { location, distribution, urlParams } = this.props;

    const buckets = getFormattedBuckets(
      distribution.buckets,
      distribution.bucketSize
    );

    const isEmpty = distribution.totalHits === 0;
    const xMax = d3.max(buckets, d => d.x) || 0;
    const timeFormatter = getTimeFormatter(xMax);
    const unit = timeUnit(xMax);

    if (isEmpty) {
      return <EmptyMessage heading="No transactions were found." />;
    }

    const bucketIndex = buckets.findIndex(
      bucket =>
        bucket.sample != null &&
        bucket.sample.transactionId === urlParams.transactionId &&
        bucket.sample.traceId === urlParams.traceId
    );

    return (
      <div>
        <EuiTitle size="s">
          <h5>
            Transactions duration distribution{' '}
            <EuiToolTip
              content={
                <div>
                  <EuiText>
                    <strong>Sampling</strong>
                  </EuiText>
                  <EuiText>
                    Each bucket will show a sample transaction. If there&apos;s
                    no sample available, it&apos;s most likely because of the
                    sampling limit set in the agent configuration.
                  </EuiText>
                </div>
              }
            >
              <EuiIcon type="questionInCircle" />
            </EuiToolTip>
          </h5>
        </EuiTitle>

        <Histogram
          buckets={buckets}
          bucketSize={distribution.bucketSize}
          bucketIndex={bucketIndex}
          onClick={(bucket: IChartPoint) => {
            if (bucket.sample && bucket.y > 0) {
              history.replace({
                ...location,
                search: fromQuery({
                  ...toQuery(location.search),
                  transactionId: bucket.sample.transactionId,
                  traceId: bucket.sample.traceId
                })
              });
            }
          }}
          formatX={timeFormatter}
          formatYShort={this.formatYShort}
          formatYLong={this.formatYLong}
          verticalLineHover={(bucket: IChartPoint) =>
            bucket.y > 0 && !bucket.sample
          }
          backgroundHover={(bucket: IChartPoint) =>
            bucket.y > 0 && bucket.sample
          }
          tooltipHeader={(bucket: IChartPoint) =>
            `${timeFormatter(bucket.x0, { withUnit: false })} - ${timeFormatter(
              bucket.x,
              { withUnit: false }
            )} ${unit}`
          }
          tooltipFooter={(bucket: IChartPoint) =>
            !bucket.sample && 'No sample available for this bucket'
          }
        />
      </div>
    );
  }
}

function unitShort(type: string | undefined) {
  return type === 'request' ? 'req.' : 'trans.';
}

function unitLong(type: string | undefined, count: number) {
  const suffix = count > 1 ? 's' : '';

  return type === 'request' ? `request${suffix}` : `transaction${suffix}`;
}
