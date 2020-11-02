/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { Feature } from 'geojson';
import { extractPropertiesFromBucket } from '../../../../common/elasticsearch_util';

const KEYS_TO_IGNORE = ['key', 'path'];

export function convertToGeoJson(esResponse: any, entitySplitFieldName: string) {
  const features = [];

  const buckets = _.get(esResponse, 'aggregations.entitySplit.buckets', []);
  buckets.forEach((bucket: any) => {
    const feature = bucket.path as Feature;
    feature.id = bucket.key;
    feature.properties = {
      [entitySplitFieldName]: bucket.key,
      ...feature.properties,
      ...extractPropertiesFromBucket(bucket, KEYS_TO_IGNORE),
    };
    features.push(feature);
  });

  return {
    featureCollection: {
      type: 'FeatureCollection',
      features,
    },
  };
}
