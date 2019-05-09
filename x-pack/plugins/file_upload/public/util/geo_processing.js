/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

const DEFAULT_SETTINGS = {
  number_of_shards: 1
};

const DEFAULT_GEO_SHAPE_MAPPINGS = {
  'coordinates': {
    'type': 'geo_shape'
  }
};

const DEFAULT_GEO_POINT_MAPPINGS = {
  'coordinates': {
    'type': 'geo_point'
  }
};

const DEFAULT_INGEST_PIPELINE = {};

export function getGeoIndexTypesForFeatures(featureTypes) {
  if (!featureTypes || !featureTypes.length) {
    return [];
  } else if (!featureTypes.includes('Point')) {
    return ['geo_shape'];
  } else if (featureTypes.includes('Point') && featureTypes.length === 1) {
    return [ 'geo_point', 'geo_shape' ];
  } else {
    return [ 'geo_shape' ];
  }
}

function geoJsonToEs(parsedGeojson, datatype) {
  if (!parsedGeojson) {
    return [];
  }
  const features = parsedGeojson.type === 'Feature'
    ? [ parsedGeojson ]
    : parsedGeojson.features;

  if (datatype === 'geo_shape') {
    return features.reduce((accu, feature) => {
      const properties = _.get(feature, 'properties');
      accu.push({
        coordinates: {
          'type': feature.geometry.type.toLowerCase(),
          'coordinates': feature.geometry.coordinates
        },
        ...(!_.isEmpty(properties) ? { ...properties } : {})
      });
      return accu;
    }, []);
  } else if (datatype === 'geo_point') {
    return features.reduce((accu, feature) => {
      const properties = _.get(feature, 'properties');
      accu.push({
        coordinates: feature.geometry.coordinates,
        ...(!_.isEmpty(properties) ? { ...properties } : {})
      });
      return accu;
    }, []);
  } else {
    console.warn(`Unhandled datatype: ${datatype}`);
    return [];
  }
}

export function getGeoJsonIndexingDetails(parsedGeojson, dataType) {
  return {
    data: geoJsonToEs(parsedGeojson, dataType),
    ingestPipeline: DEFAULT_INGEST_PIPELINE,
    mappings: (dataType === 'geo_point')
      ? DEFAULT_GEO_POINT_MAPPINGS
      : DEFAULT_GEO_SHAPE_MAPPINGS,
    settings: DEFAULT_SETTINGS
  };
}
