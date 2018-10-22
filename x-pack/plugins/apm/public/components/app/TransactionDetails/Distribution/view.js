/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import d3 from 'd3';
import Histogram from '../../../shared/charts/Histogram';
import { toQuery, fromQuery, history } from '../../../../utils/url';
import { HeaderSmall } from '../../../shared/UIComponents';
import EmptyMessage from '../../../shared/EmptyMessage';
import { getTimeFormatter, timeUnit } from '../../../../utils/formatters';
import SamplingTooltip from './SamplingTooltip';

export function getFormattedBuckets(buckets, bucketSize) {
  if (!buckets) {
    return null;
  }

  return buckets.map(({ sampled, count, key, transactionId }) => {
    return {
      sampled,
      transactionId,
      x0: key,
      x: key + bucketSize,
      y: count,
      style: count > 0 && sampled ? { cursor: 'pointer' } : {}
    };
  });
}

class Distribution extends Component {
  formatYShort = t => {
    return `${t} ${unitShort(this.props.urlParams.transactionType)}`;
  };

  formatYLong = t => {
    return `${t} ${unitLong(this.props.urlParams.transactionType, t)}`;
  };

  render() {
    const { location, distribution } = this.props;

    const buckets = getFormattedBuckets(
      distribution.buckets,
      distribution.bucketSize
    );

    const isEmpty = distribution.totalHits === 0;
    const xMax = d3.max(buckets, d => d.x);
    const timeFormatter = getTimeFormatter(xMax);
    const unit = timeUnit(xMax);

    if (isEmpty) {
      return <EmptyMessage heading="No transactions were found." />;
    }

    const bucketIndex = buckets.findIndex(
      bucket => bucket.transactionId === this.props.urlParams.transactionId
    );

    return (
      <div>
        <HeaderSmall
          css={`
            display: flex;
            align-items: center;
          `}
        >
          <span>Response time distribution</span>
          <SamplingTooltip />
        </HeaderSmall>
        <Histogram
          buckets={buckets}
          bucketSize={distribution.bucketSize}
          bucketIndex={bucketIndex}
          onClick={bucket => {
            if (bucket.sampled && bucket.y > 0) {
              history.replace({
                ...location,
                search: fromQuery({
                  ...toQuery(location.search),
                  transactionId: bucket.transactionId
                })
              });
            }
          }}
          formatX={timeFormatter}
          formatYShort={this.formatYShort}
          formatYLong={this.formatYLong}
          verticalLineHover={bucket => bucket.y > 0 && !bucket.sampled}
          backgroundHover={bucket => bucket.y > 0 && bucket.sampled}
          tooltipHeader={bucket =>
            `${timeFormatter(bucket.x0, false)} - ${timeFormatter(
              bucket.x,
              false
            )} ${unit}`
          }
          tooltipFooter={bucket =>
            !bucket.sampled && 'No sample available for this bucket'
          }
        />
      </div>
    );
  }
}

function unitShort(type) {
  return type === 'request' ? 'req.' : 'trans.';
}

function unitLong(type, count) {
  const suffix = count > 1 ? 's' : '';

  return type === 'request' ? `request${suffix}` : `transaction${suffix}`;
}

Distribution.propTypes = {
  urlParams: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
  distribution: PropTypes.object
};

export default Distribution;
