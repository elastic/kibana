/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COUNT_PROP_NAME } from '../../../../../common/constants';
import type { BucketProperties, PropertiesMap } from '../../../../../common/elasticsearch_util';
import { extractPropertiesFromBucket } from '../../../../../common/elasticsearch_util';

const IGNORE_LIST = [COUNT_PROP_NAME];

export function processDistanceResponse(response: any, countPropertyName: string): PropertiesMap {
  const propertiesMap: PropertiesMap = new Map<string, BucketProperties>();
  const buckets: any = response?.aggregations?.distance?.buckets ?? {};
  for (const docId in buckets) {
    if (buckets.hasOwnProperty(docId)) {
      const bucket = buckets[docId];

      // skip empty buckets
      if (bucket[COUNT_PROP_NAME] === 0) {
        continue;
      }

      const properties = extractPropertiesFromBucket(bucket, IGNORE_LIST);
      // Manually set 'doc_count' so join name, like '__kbnjoin__count__673ff994', is used
      properties[countPropertyName] = bucket[COUNT_PROP_NAME];
      propertiesMap.set(docId, properties);
    }
  }
  return propertiesMap;
}
