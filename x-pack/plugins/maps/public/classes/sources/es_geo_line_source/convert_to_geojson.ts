/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { Feature, FeatureCollection } from 'geojson';
import { extractPropertiesFromBucket } from '../../../../common/elasticsearch_util';

const KEYS_TO_IGNORE = ['key', 'path'];

export function convertToGeoJson(
  esResponse: any,
  entitySplitFieldName: string,
  sortFieldName: string
) {
  const features: Feature[] = [];
  let numTrimmedTracks = 0;

  const buckets = _.get(esResponse, 'aggregations.tracks.buckets', {});
  const entityKeys = Object.keys(buckets);
  for (let i = 0; i < entityKeys.length; i++) {
    const entityKey = entityKeys[i];
    const bucket = buckets[entityKey];
    const trackFeature = bucket.path as Feature;
    if (!trackFeature.properties!.complete) {
      numTrimmedTracks++;
    }

    // Create feature for each segment in track (LineString)
    for (let i = 1; i < trackFeature.geometry.coordinates.length; i++) {
      features.push({
        id: `${entityKey}_${i}`,
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            trackFeature.geometry.coordinates[i - 1],
            trackFeature.geometry.coordinates[i],
          ],
        },
        properties: {
          [entitySplitFieldName]: entityKey,
          [sortFieldName]: trackFeature.properties.sort_values[i],
          complete: trackFeature.properties.complete,
          ...extractPropertiesFromBucket(bucket, KEYS_TO_IGNORE),
        },
      });
    }
  }

  return {
    featureCollection: {
      type: 'FeatureCollection',
      features,
    } as FeatureCollection,
    numTrimmedTracks,
  };
}
