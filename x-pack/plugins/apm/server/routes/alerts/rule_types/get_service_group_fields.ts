/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsTopHitsAggregation } from '@elastic/elasticsearch/lib/api/types';
import { SERVICE_GROUP_SUPPORTED_FIELDS } from '../../../../common/service_groups';

export interface SourceDoc {
  [key: string]: string | SourceDoc;
}

export interface TermsAggFields {
  topHitsOpts?: AggregationsTopHitsAggregation;
  groupBy?: string[] | string | undefined;
}

export function getServiceGroupFieldsAgg({
  topHitsOpts,
  groupBy,
}: TermsAggFields) {
  return {
    source_fields: {
      top_hits: {
        size: 1,
        _source: {
          includes: [
            ...SERVICE_GROUP_SUPPORTED_FIELDS,
            ...(groupBy ? [groupBy] : []).flat(),
          ],
        },
        ...topHitsOpts,
      },
    },
  };
}

interface AggResultBucket {
  source_fields: {
    hits: {
      hits: Array<{ _source: any }>;
    };
  };
}

export function getServiceGroupFields(bucket?: AggResultBucket) {
  if (!bucket) {
    return {};
  }
  const sourceDoc: SourceDoc =
    bucket?.source_fields?.hits.hits[0]?._source ?? {};
  return flattenSourceDoc(sourceDoc);
}

export function flattenSourceDoc(
  val: SourceDoc | string,
  path: string[] = []
): Record<string, string> {
  if (typeof val !== 'object') {
    return { [path.join('.')]: val };
  }
  return Object.keys(val).reduce((acc, key) => {
    const fieldMap = flattenSourceDoc(val[key], [...path, key]);
    return { ...acc, ...fieldMap };
  }, {});
}
