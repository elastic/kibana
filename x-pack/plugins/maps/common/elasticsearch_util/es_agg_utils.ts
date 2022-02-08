/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import type { DataView, DataViewField } from 'src/plugins/data/common';
import { AGG_TYPE, JOIN_FIELD_NAME_PREFIX, TOP_TERM_PERCENTAGE_SUFFIX } from '../constants';

export type BucketProperties = Record<string | number, unknown>;
export type PropertiesMap = Map<string, BucketProperties>;

export function getField(indexPattern: DataView, fieldName: string): DataViewField {
  const field = indexPattern.fields.getByName(fieldName);
  if (!field) {
    throw new Error(
      i18n.translate('xpack.maps.source.esSearch.fieldNotFoundMsg', {
        defaultMessage: `Unable to find '{fieldName}' in index-pattern '{indexPatternTitle}'.`,
        values: { fieldName, indexPatternTitle: indexPattern.title },
      })
    );
  }
  return field;
}

export function addFieldToDSL(dsl: object, field: DataViewField) {
  return !field.scripted
    ? { ...dsl, field: field.name }
    : {
        ...dsl,
        script: {
          source: field.script,
          lang: field.lang,
        },
      };
}

export function extractPropertiesFromBucket(
  bucket: any,
  ignoreKeys: string[] = []
): BucketProperties {
  const properties: BucketProperties = {};
  for (const key in bucket) {
    if (ignoreKeys.includes(key) || !bucket.hasOwnProperty(key)) {
      continue;
    }

    // todo: push these implementations in the IAggFields
    if (_.has(bucket[key], 'value')) {
      properties[key] = bucket[key].value;
    } else if (_.has(bucket[key], 'buckets')) {
      if (bucket[key].buckets.length === 0) {
        // No top term
        continue;
      }

      properties[key] = _.get(bucket[key], 'buckets[0].key');
      const topBucketCount = bucket[key].buckets[0].doc_count;
      const totalCount = bucket.doc_count;
      if (totalCount && topBucketCount) {
        properties[`${key}${TOP_TERM_PERCENTAGE_SUFFIX}`] = Math.round(
          (topBucketCount / totalCount) * 100
        );
      }
    } else {
      if (
        key.startsWith(AGG_TYPE.PERCENTILE) ||
        key.startsWith(JOIN_FIELD_NAME_PREFIX + AGG_TYPE.PERCENTILE)
      ) {
        const values = bucket[key].values;
        for (const k in values) {
          if (values.hasOwnProperty(k)) {
            properties[key] = values[k];
            break;
          }
        }
      } else {
        properties[key] = bucket[key];
      }
    }
  }
  return properties;
}
