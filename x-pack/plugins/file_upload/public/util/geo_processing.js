/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { ES_GEO_FIELD_TYPE } from '../../common/constants/file_import';
import { i18n } from '@kbn/i18n';

const DEFAULT_SETTINGS = {
  number_of_shards: 1
};

const DEFAULT_GEO_SHAPE_MAPPINGS = {
  'coordinates': {
    'type': ES_GEO_FIELD_TYPE.GEO_SHAPE
  }
};

const DEFAULT_GEO_POINT_MAPPINGS = {
  'coordinates': {
    'type': ES_GEO_FIELD_TYPE.GEO_POINT
  }
};

const DEFAULT_INGEST_PIPELINE = {};

export function getGeoIndexTypesForFeatures(featureTypes) {
  if (!featureTypes || !featureTypes.length) {
    return [];
  } else if (!featureTypes.includes('Point')) {
    return [ES_GEO_FIELD_TYPE.GEO_SHAPE];
  } else if (featureTypes.includes('Point') && featureTypes.length === 1) {
    return [ ES_GEO_FIELD_TYPE.GEO_POINT, ES_GEO_FIELD_TYPE.GEO_SHAPE ];
  } else {
    return [ ES_GEO_FIELD_TYPE.GEO_SHAPE ];
  }
}

// Reduces & flattens geojson to coordinates and properties (if any)
export function geoJsonToEs(parsedGeojson, datatype) {
  if (!parsedGeojson) {
    return [];
  }
  const features = parsedGeojson.type === 'Feature'
    ? [ parsedGeojson ]
    : parsedGeojson.features;

  if (datatype === ES_GEO_FIELD_TYPE.GEO_SHAPE) {
    return features.reduce((accu, { geometry, properties }) => {
      const { coordinates } = geometry;
      accu.push({
        coordinates: {
          'type': geometry.type.toLowerCase(),
          'coordinates': coordinates
        },
        ...(!_.isEmpty(properties) ? { ...properties } : {})
      });
      return accu;
    }, []);
  } else if (datatype === ES_GEO_FIELD_TYPE.GEO_POINT) {
    return features.reduce((accu, { geometry, properties }) => {
      const { coordinates } = geometry;
      if (Array.isArray(coordinates[0])) {
        throw(
          i18n.translate(
            'xpack.fileUpload.geoProcessing.notPointError', {
              defaultMessage: 'Coordinates {coordinates} does not contain point datatype',
              values: { coordinates: coordinates.toString() }
            })
        );
        return accu;
      }
      accu.push({
        coordinates,
        ...(!_.isEmpty(properties) ? { ...properties } : {})
      });
      return accu;
    }, []);
  } else {
    return [];
  }
}

export function getGeoJsonIndexingDetails(parsedGeojson, dataType) {
  return {
    data: geoJsonToEs(parsedGeojson, dataType),
    ingestPipeline: DEFAULT_INGEST_PIPELINE,
    mappings: (dataType === ES_GEO_FIELD_TYPE.GEO_POINT)
      ? DEFAULT_GEO_POINT_MAPPINGS
      : DEFAULT_GEO_SHAPE_MAPPINGS,
    settings: DEFAULT_SETTINGS
  };
}
