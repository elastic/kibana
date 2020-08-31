/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraMetadataFeature } from '../../../../../common/http_api/metadata_api';
import { InventoryMetric } from '../../../../../common/inventory_models/types';
import { metrics } from '../../../../../common/inventory_models/metrics';

export const getFilteredMetrics = (
  requiredMetrics: InventoryMetric[],
  metadata: Array<InfraMetadataFeature | null | undefined>
) => {
  const metricMetadata = metadata
    .filter((data) => data && data.source === 'metrics')
    .map((data) => data && data.name);
  return requiredMetrics.filter((metric) => {
    const metricModelCreator = metrics.tsvb[metric];
    // We just need to get a dummy version of the model so we can filter
    // using the `requires` attribute.
    const metricModel = metricModelCreator('@timestamp', 'test', '>=1m');
    return metricMetadata.some((m) => m && metricModel.requires.includes(m));
  });
};
