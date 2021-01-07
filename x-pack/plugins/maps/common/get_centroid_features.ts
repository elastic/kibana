/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Feature,
  FeatureCollection,
  Geometry,
  LineString,
  MultiLineString,
  MultiPolygon,
} from 'geojson';
import turfAlong from '@turf/along';
import turfArea from '@turf/area';
// @ts-expect-error
import turfCenterOfMass from '@turf/center-of-mass';
import turfLength from '@turf/length';
import { lineString, polygon } from '@turf/helpers';
import {
  GEO_JSON_TYPE,
  KBN_IS_CENTROID_FEATURE,
  KBN_TOO_MANY_FEATURES_PROPERTY,
} from './constants';

export function getCentroidFeatures(featureCollection: FeatureCollection): Feature[] {
  const centroidFeatures = [];
  for (let i = 0; i < featureCollection.features.length; i++) {
    const feature = featureCollection.features[i];

    // do not add centroid for kibana added features
    if (feature.properties?.[KBN_TOO_MANY_FEATURES_PROPERTY]) {
      continue;
    }

    let centroidGeometry: Geometry | null = null;
    if (feature.geometry.type === GEO_JSON_TYPE.LINE_STRING) {
      centroidGeometry = getLineCentroid(feature);
    } else if (feature.geometry.type === GEO_JSON_TYPE.MULTI_LINE_STRING) {
      const coordinates = (feature.geometry as MultiLineString).coordinates;
      let longestLine = coordinates[0];
      let longestLength = turfLength(lineString(longestLine));
      for (let j = 1; j < coordinates.length; j++) {
        const nextLine = coordinates[j];
        const nextLength = turfLength(lineString(nextLine));
        if (nextLength > longestLength) {
          longestLine = nextLine;
          longestLength = nextLength;
        }
      }
      centroidGeometry = getLineCentroid(lineString(longestLine) as Feature);
    } else if (feature.geometry.type === GEO_JSON_TYPE.POLYGON) {
      centroidGeometry = turfCenterOfMass(feature).geometry;
    } else if (feature.geometry.type === GEO_JSON_TYPE.MULTI_POLYGON) {
      const coordinates = (feature.geometry as MultiPolygon).coordinates;
      let largestPolygon = coordinates[0];
      let largestArea = turfArea(polygon(largestPolygon));
      for (let j = 1; j < coordinates.length; j++) {
        const nextPolygon = coordinates[j];
        const nextArea = turfArea(polygon(nextPolygon));
        if (nextArea > largestArea) {
          largestPolygon = nextPolygon;
          largestArea = nextArea;
        }
      }
      centroidGeometry = turfCenterOfMass(polygon(largestPolygon)).geometry;
    }

    if (centroidGeometry) {
      centroidFeatures.push({
        type: 'Feature',
        id: feature.id,
        properties: {
          ...feature.properties,
          [KBN_IS_CENTROID_FEATURE]: true,
        },
        geometry: centroidGeometry,
      } as Feature);
    }
  }
  return centroidFeatures;
}

function getLineCentroid(feature: Feature): Geometry {
  const length = turfLength(feature);
  return turfAlong((feature as unknown) as LineString, length / 2).geometry!;
}
