/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import turf from 'turf';
import { FeatureCollection } from 'geojson';
import { MapExtent } from '../../../common/descriptor_types';
import { FEATURE_VISIBLE_PROPERTY_NAME } from '../../../common/constants';

export function getFeatureCollectionBounds(
  featureCollection: FeatureCollection | null,
  hasJoins: boolean
): MapExtent | null {
  if (!featureCollection) {
    return null;
  }

  const visibleFeatures = hasJoins
    ? featureCollection.features.filter((feature) => {
        return feature.properties && feature.properties[FEATURE_VISIBLE_PROPERTY_NAME];
      })
    : featureCollection.features;

  if (visibleFeatures.length === 0) {
    return null;
  }

  const bbox = turf.bbox({
    type: 'FeatureCollection',
    features: visibleFeatures,
  });
  return {
    minLon: bbox[0],
    minLat: bbox[1],
    maxLon: bbox[2],
    maxLat: bbox[3],
  };
}
