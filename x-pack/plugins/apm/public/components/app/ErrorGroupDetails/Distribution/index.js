/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import Histogram from '../../../shared/charts/Histogram';
import EmptyMessage from '../../../shared/EmptyMessage';
import { HeaderSmall } from '../../../shared/UIComponents';

export function getFormattedBuckets(buckets, bucketSize) {
  if (!buckets) {
    return null;
  }

  return buckets.map(({ count, key }) => {
    return {
      x0: key,
      x: key + bucketSize,
      y: count
    };
  });
}

function Distribution({ distribution }) {
  const buckets = getFormattedBuckets(
    distribution.buckets,
    distribution.bucketSize
  );

  const isEmpty = distribution.totalHits === 0;

  if (isEmpty) {
    return <EmptyMessage heading="No errors were found" />;
  }

  return (
    <div>
      <HeaderSmall>Occurrences</HeaderSmall>
      <Histogram
        verticalLineHover={bucket => bucket.x}
        xType="time"
        buckets={buckets}
        bucketSize={distribution.bucketSize}
        formatYShort={value => `${value} occ.`}
        formatYLong={value => `${value} occurrences`}
      />
    </div>
  );
}

export default Distribution;
