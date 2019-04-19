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
  'name': {
    'type': 'keyword'
  },
  'location': {
    'type': 'geo_shape'
  }
};

const DEFAULT_GEO_POINT_MAPPINGS = {
  'name': {
    'type': 'keyword'
  },
  'location': {
    'type': 'geo_point'
  }
};

const DEFAULT_INGEST_PIPELINE = {};

export const selectMappingsOptions = [{
  text: 'geo_point',
  value: 'geo_point'
}, {
  text: 'geo_shape',
  value: 'geo_shape'
}];

function geoJsonToEs(parsedGeojson, datatype) {
  if (!parsedGeojson) {
    return [];
  }
  const features = parsedGeojson.type === 'Feature'
    ? [ parsedGeojson ]
    : parsedGeojson.features;

  if (datatype === 'geo_shape') {
    return features.reduce((accu, feature) => {
      accu.push({
        location: {
          'type': feature.geometry.type.toLowerCase(),
          'coordinates': feature.geometry.coordinates
        },
        name: _.get(feature, 'properties.name', '')
      });
      return accu;
    }, []);
  } else if (datatype === 'geo_point') {
    return features.reduce((accu, shape) => {
      accu.push({
        location: shape.geometry.coordinates,
        name: _.get(shape, 'properties.name', '')
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
