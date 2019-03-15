/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';

import { geoPointToGeometry } from '../../../../elasticsearch_geo_utils';

const trackCountTitle = i18n.translate('xpack.maps.source.esTracks.trackCountTitle', {
  defaultMessage: 'track count'
});

const totalCountTitle = i18n.translate('xpack.maps.source.esTracks.totalCountTitle', {
  defaultMessage: 'total count'
});

// Convert terms/top_hits agg results to feature collection of line strings
export function convertToGeoJson({ resp, geoField, timeField, splitField, flattenHit }) {

  function hitsToLineString(hits) {
    return hits.reduce((lineString, hit) => {
      const properties = flattenHit(hit);
      const pointGeometries = geoPointToGeometry(properties[geoField]);
      const points = pointGeometries.map(pointGeometry => {
        return pointGeometry.coordinates;
      });
      return [...lineString, ...points];
    }, []);
  }

  function getHitTimestamp(hit) {
    const properties = flattenHit(hit);
    return properties[timeField];
  }

  const features = [];
  let areResultsTrimmed = false;
  const tracks = _.get(resp, 'aggregations.tracks.buckets', []);
  tracks.forEach(track => {
    const hits = _.get(track, 'points.hits.hits');
    if (!hits) {
      return;
    }

    if (hits.length < track.doc_count) {
      areResultsTrimmed = true;
    }

    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: hitsToLineString(hits)
      },
      properties: {
        [splitField]: track.key,
        [trackCountTitle]: hits.length,
        [totalCountTitle]: track.doc_count,
        first: getHitTimestamp(hits[0]),
        last: getHitTimestamp(hits[(hits.length - 1)]),
      }
    });
  });

  return {
    featureCollection: {
      type: 'FeatureCollection',
      features: features
    },
    areResultsTrimmed,
  };
}
