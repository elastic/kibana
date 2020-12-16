/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature, FeatureCollection, Geometry } from 'geojson';
import turfArea from '@turf/area';
import turfCenterOfMass from '@turf/center-of-mass';
import turfLength from '@turf/length';
import { lineString, polygon } from '@turf/helpers';
import { GEO_JSON_TYPE, KBN_IS_CENTROID_FEATURE } from './constants';

export function getCentroidFeatures(featureCollection: FeatureCollection): Feature[] {
  const centroidFeatures = [];
  for (let i = 0; i < featureCollection.features.length; i++) {
    const feature = featureCollection.features[i];
    let centroidGeometry: Geometry | null = null;
    if (feature.geometry.type === GEO_JSON_TYPE.LINE_STRING) {
      centroidGeometry = getLineCentroid(feature.geometry.coordinates);
    } else if (feature.geometry.type === GEO_JSON_TYPE.MULTI_LINE_STRING) {
      let longestLine = feature.geometry.coordinates[0];
      let longestLength = turfLength(lineString(longestLine));
      for (let j = 1; j < feature.geometry.coordinates.length; j++) {
        const nextLine = feature.geometry.coordinates[j];
        const nextLength = turfLength(lineString(nextLine));
        if (nextLength > longestLength) {
          longestLine = nextLine;
          longestLength = nextLength;
        }
      }
      centroidGeometry = getLineCentroid(longestLine);
    } else if (feature.geometry.type === GEO_JSON_TYPE.POLYGON) {
      centroidGeometry = turfCenterOfMass(feature).geometry;
    } else if (feature.geometry.type === GEO_JSON_TYPE.MULTI_POLYGON) {
      let largestPolygon = feature.geometry.coordinates[0];
      let largestArea = turfArea(polygon(largestPolygon));
      for (let j = 1; j < feature.geometry.coordinates.length; j++) {
        const nextPolygon = feature.geometry.coordinates[j];
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
        ...feature,
        properties: {
          ...feature.properties,
          [KBN_IS_CENTROID_FEATURE]: true,
        },
        geometry: centroidGeometry,
      });
    }
  }
  return centroidFeatures;
}

// To ensure centroid is placed on line and fast calculations, centroid is middle point
function getLineCentroid(lineCoordinates: Position[]): Geometry {
  const centerPointIndex = Math.ceil(lineCoordinates.length / 2) - 1;
  return {
    type: GEO_JSON_TYPE.POINT,
    coordinates: lineCoordinates[centerPointIndex],
  };
}
