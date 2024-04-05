/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsTopHitsAggregation } from '@elastic/elasticsearch/lib/api/types';
import { AggregationResultOf } from '@kbn/es-types';
import { CONTAINER_ID, HOST_NAME } from '../../../../common/es_fields/apm';
import {
  LABELS,
  SERVICE_GROUP_SUPPORTED_FIELDS,
} from '../../../../common/service_groups';

export interface SourceDoc {
  [key: string]: string | string[] | SourceDoc;
}

export function getApmAlertSourceFieldsAgg(
  topHitsOpts: AggregationsTopHitsAggregation = {}
) {
  return {
    top_hit_source_fields: {
      top_hits: {
        size: 1,
        _source: {
          includes: SERVICE_GROUP_SUPPORTED_FIELDS,
        },
        ...topHitsOpts,
      },
    },

    // get related container and hosts for the alert
    [CONTAINER_ID]: { terms: { field: CONTAINER_ID, size: 20 } },
    [HOST_NAME]: { terms: { field: HOST_NAME, size: 20 } },
  };
}
type TermsAggResult = AggregationResultOf<{ terms: any }, unknown>;

interface AggResultBucket {
  top_hit_source_fields: { hits: { hits: Array<{ _source: any }> } };
  [CONTAINER_ID]: TermsAggResult;
  [HOST_NAME]: TermsAggResult;
}

// Ungrouped source fields like `container.id` and `host.name` should only be returned if we can return all the values.
// If doc_count_error_upper_bound is greater than 0, it means that there are more values than we can return.
function getUngroupedSourceField(
  bucket: AggResultBucket['container.id'] | AggResultBucket['host.name']
) {
  return bucket.doc_count_error_upper_bound > 0
    ? []
    : bucket.buckets.map(({ key }) => key as string);
}

export function getApmAlertSourceFields(
  bucket?: AggResultBucket
): Record<string, string | string[]> {
  if (!bucket) {
    return {};
  }

  const sourceDoc: SourceDoc =
    bucket?.top_hit_source_fields?.hits.hits[0]?._source ?? {};
  const topHits = flattenSourceDoc(sourceDoc);

  return {
    [CONTAINER_ID]: getUngroupedSourceField(bucket[CONTAINER_ID]),
    [HOST_NAME]: getUngroupedSourceField(bucket[HOST_NAME]),
    ...topHits,
  };
}

export function flattenSourceDoc(
  val: SourceDoc | string,
  path: string[] = []
): Record<string, string | object> {
  if (typeof val !== 'object' || (path.length > 0 && path[0] === LABELS)) {
    return { [path.join('.')]: val };
  }
  return Object.keys(val).reduce((acc, key) => {
    const fieldMap = flattenSourceDoc(val[key] as SourceDoc | string, [
      ...path,
      key,
    ]);
    return Object.assign(acc, fieldMap);
  }, {});
}
