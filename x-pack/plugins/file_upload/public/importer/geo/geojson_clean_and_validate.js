/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as jsts from 'jsts';
import rewind from '@mapbox/geojson-rewind';

const geoJSONReader = new jsts.io.GeoJSONReader();
const geoJSONWriter = new jsts.io.GeoJSONWriter();

export function geoJsonCleanAndValidate(feature) {
  let cleanedGeometry;
  // Attempts to clean geometry. If this fails, don't generate errors at this
  // point, these will be handled more accurately on write to ES with feedback
  // given to user
  try {
    const geometryReadResult = geoJSONReader.read(feature);
    cleanedGeometry = cleanGeometry(geometryReadResult);
  } catch (e) {
    return feature;
  }

  // JSTS does not enforce winding order, wind in clockwise order
  const correctlyWindedGeometry = rewind(cleanedGeometry, false);

  return {
    ...feature,
    geometry: correctlyWindedGeometry,
  };
}

export function cleanGeometry({ geometry }) {
  if (!geometry) {
    return null;
  }
  const geometryToWrite = geometry.isSimple() || geometry.isValid() ? geometry : geometry.buffer(0);
  return geoJSONWriter.write(geometryToWrite);
}
