/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsTopHitsAggregation } from '@elastic/elasticsearch/lib/api/types';
import { mapToSingleOrMultiValue } from '@kbn/apm-data-access-plugin/server';
import { LABELS, SERVICE_GROUP_SUPPORTED_FIELDS } from '../../../../common/service_groups';

export interface SourceDoc {
  [key: string]: unknown;
}

export function getApmAlertSourceFieldsAgg(topHitsOpts: AggregationsTopHitsAggregation = {}) {
  return {
    source_fields: {
      top_hits: {
        size: 1,
        fields: SERVICE_GROUP_SUPPORTED_FIELDS,
        ...topHitsOpts,
      },
    },
  };
}

interface AggResultBucket {
  source_fields: {
    hits: {
      hits: Array<{ fields: Partial<Record<string, unknown[]>> }>;
    };
  };
}

export function getApmAlertSourceFields(bucket?: AggResultBucket): SourceDoc {
  if (!bucket) {
    return {};
  }

  return mapToSingleOrMultiValue(bucket?.source_fields?.hits.hits[0]?.fields ?? {});
}

export function flattenSourceDoc(
  val: SourceDoc | string,
  path: string[] = []
): Record<string, string | object> {
  if (typeof val !== 'object' || (path.length > 0 && path[0] === LABELS)) {
    return { [path.join('.')]: val };
  }
  return Object.keys(val).reduce((acc, key) => {
    const fieldMap = flattenSourceDoc(val[key] as SourceDoc | string, [...path, key]);
    return Object.assign(acc, fieldMap);
  }, {});
}
