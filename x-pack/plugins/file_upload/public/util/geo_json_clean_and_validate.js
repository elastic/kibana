/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const jsts = require('jsts');
import rewind from 'geojson-rewind';

export function geoJsonCleanAndValidate(parsedFile) {
  const reader = new jsts.io.GeoJSONReader();
  const gj = reader.read(parsedFile);

  const features = gj.features.map(({ id, geometry, properties }) => {
    const writer = new jsts.io.GeoJSONWriter();
    (!geometry.isSimple() || !geometry.isValid())
      ? geometry = writer.write(geometry.buffer(0))
      : geometry = writer.write(geometry);
    return ({
      type: 'Feature',
      ...(id ? { id } : {}),
      geometry,
      properties,
    });
  });

  // JSTS does not enforce winding order, wind in clockwise order
  return rewind({
    type: 'FeatureCollection',
    features,
  }, false);
}


