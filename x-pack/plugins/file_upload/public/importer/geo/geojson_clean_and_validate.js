/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rewind from '@mapbox/geojson-rewind';
import PrecisionModel from 'jsts/org/locationtech/jts/geom/PrecisionModel';
import GeometryPrecisionReducer from 'jsts/org/locationtech/jts/precision/GeometryPrecisionReducer';
import GeoJSONReader from 'jsts/org/locationtech/jts/io/GeoJSONReader';
import GeoJSONWriter from 'jsts/org/locationtech/jts/io/GeoJSONWriter';

// The GeoJSON specification suggests limiting coordinate precision to six decimal places
// See https://datatracker.ietf.org/doc/html/rfc7946#section-11.2
// We can enforce rounding to six decimal places by setting the PrecisionModel scale
// scale = 10^n where n = maximum number of decimal places
const precisionModel = new PrecisionModel(Math.pow(10, 6));
const geometryPrecisionReducer = new GeometryPrecisionReducer(precisionModel);
geometryPrecisionReducer.setChangePrecisionModel(true);
const geoJSONReader = new GeoJSONReader();
const geoJSONWriter = new GeoJSONWriter();

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

  // GeometryPrecisionReducer will automatically clean invalid geometries
  const geometryToWrite = geometryPrecisionReducer.reduce(geometry);
  return geoJSONWriter.write(geometryToWrite);
}
