/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const jsts = require('jsts');
import rewind from 'geojson-rewind';

export function geoJsonCleanAndValidate(parsedFile) {
  const reader = new jsts.io.GeoJSONReader();
  const geoJson = reader.read(parsedFile);

  const features = geoJson.features.map(({ id, geometry, properties }) => {
    const writer = new jsts.io.GeoJSONWriter();
    const geojsonGeometry = (!geometry.isSimple() || !geometry.isValid())
      ? writer.write(geometry.buffer(0))
      : writer.write(geometry);
    return ({
      type: 'Feature',
      ...(id ? { id } : {}),
      geometry: geojsonGeometry,
      properties,
    });
  });

  // JSTS does not enforce winding order, wind in clockwise order
  return rewind({
    type: 'FeatureCollection',
    features,
  }, false);
}


