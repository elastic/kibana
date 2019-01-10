/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import Histogram from '../../../shared/charts/Histogram';
import { EmptyMessage } from '../../../shared/EmptyMessage';

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

function Distribution({
  distribution,
  title = i18n.translate('xpack.apm.errorGroupDetails.occurrencesChartLabel', {
    defaultMessage: 'Occurrences'
  })
}) {
  const buckets = getFormattedBuckets(
    distribution.buckets,
    distribution.bucketSize
  );

  const isEmpty = distribution.totalHits === 0;

  if (isEmpty) {
    return (
      <EmptyMessage
        heading={i18n.translate('xpack.apm.errorGroupDetails.noErrorsLabel', {
          defaultMessage: 'No errors were found'
        })}
      />
    );
  }

  return (
    <div>
      <EuiTitle size="s">
        <span>{title}</span>
      </EuiTitle>
      <Histogram
        verticalLineHover={bucket => bucket.x}
        xType="time"
        buckets={buckets}
        bucketSize={distribution.bucketSize}
        formatYShort={value =>
          i18n.translate('xpack.apm.errorGroupDetails.occurrencesShortLabel', {
            defaultMessage: '{occCount} occ.',
            values: { occCount: value }
          })
        }
        formatYLong={value =>
          i18n.translate('xpack.apm.errorGroupDetails.occurrencesLongLabel', {
            defaultMessage: '{occCount} occurrences',
            values: { occCount: value }
          })
        }
      />
    </div>
  );
}

export default Distribution;
