/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetadataAggregationBucket } from '../../../lib/adapters/framework';

export const pickFeatureName = (buckets: InfraMetadataAggregationBucket[]): string[] => {
  if (buckets) {
    const metadata = buckets.map(bucket => bucket.key);
    return metadata;
  } else {
    return [];
  }
};
