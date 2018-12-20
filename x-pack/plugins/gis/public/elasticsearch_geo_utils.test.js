/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  hitsToGeoJson,
  geoPointToGeometry,
  geoShapeToGeometry,
  createExtentFilter,
  convertMapExtentToEnvelope,
} from './elasticsearch_geo_utils';

const geoFieldName = 'location';
const mapExtent = {
  max_lat: 39,
  max_lon: -83,
  min_lat: 35,
  min_lon: -89,
};

describe('hitsToGeoJson', () => {
  it('Should convert elasitcsearch hits to geojson', () => {
    const hits = [
      {
        _source: {
          [geoFieldName]: { lat: 20, lon: 100 }
        }
      },
      {
        _source: {
          [geoFieldName]: { lat: 30, lon: 110 }
        }
      },
    ];
    const geojson = hitsToGeoJson(hits, geoFieldName, 'geo_point');
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features.length).toBe(2);
    expect(geojson.features[0]).toEqual({
      geometry: {
        coordinates: [100, 20],
        type: 'Point',
      },
      properties: {},
      type: 'Feature',
    });
  });

  it('Should handle documents where geoField is not populated', () => {
    const hits = [
      {
        _source: {
          [geoFieldName]: { lat: 20, lon: 100 }
        }
      },
      {
        _source: {}
      },
    ];
    const geojson = hitsToGeoJson(hits, geoFieldName, 'geo_point');
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features.length).toBe(1);
  });

  it('Should populate properties from _source and fields', () => {
    const hits = [
      {
        _source: {
          [geoFieldName]: { lat: 20, lon: 100 },
          myField: 8,
        },
        fields: {
          myScriptedField: 10
        }
      }
    ];
    const geojson = hitsToGeoJson(hits, geoFieldName, 'geo_point');
    expect(geojson.features.length).toBe(1);
    const feature = geojson.features[0];
    expect(feature.properties.myField).toBe(8);
    expect(feature.properties.myScriptedField).toBe(10);
  });

  it('Should unwrap computed fields', () => {
    const hits = [
      {
        _source: {
          [geoFieldName]: { lat: 20, lon: 100 },
        },
        fields: {
          myScriptedField: [ 10 ] // script_fields are returned in an array
        }
      }
    ];
    const geojson = hitsToGeoJson(hits, geoFieldName, 'geo_point');
    expect(geojson.features.length).toBe(1);
    const feature = geojson.features[0];
    expect(feature.properties.myScriptedField).toBe(10);
  });
});

describe('geoPointToGeometry', () => {
  const lat = 41.12;
  const lon = -71.34;

  it('Should convert value stored as geo-point string', () => {
    const value = `${lat},${lon}`;
    const out = geoPointToGeometry(value);
    expect(out.type).toBe('Point');
    expect(out.coordinates).toEqual([lon, lat]);
  });

  it('Should convert value stored as geo-point array', () => {
    const value = [lon, lat];
    const out = geoPointToGeometry(value);
    expect(out.type).toBe('Point');
    expect(out.coordinates).toEqual([lon, lat]);
  });

  it('Should convert value stored as geo-point object', () => {
    const value = {
      lat,
      lon,
    };
    const out = geoPointToGeometry(value);
    expect(out.type).toBe('Point');
    expect(out.coordinates).toEqual([lon, lat]);
  });
});

describe('geoShapeToGeometry', () => {
  it('Should convert value stored as geojson', () => {
    const coordinates = [[-77.03653, 38.897676], [-77.009051, 38.889939]];
    const value = {
      type: 'linestring',
      coordinates: coordinates
    };
    const out = geoShapeToGeometry(value);
    expect(out.type).toBe('LineString');
    expect(out.coordinates).toEqual(coordinates);
  });
});

describe('createExtentFilter', () => {
  it('should return elasticsearch geo_bounding_box filter for geo_point field', () => {
    const filter = createExtentFilter(mapExtent, geoFieldName, 'geo_point');
    expect(filter).toEqual({
      geo_bounding_box: {
        [geoFieldName]: {
          top_left: {
            lat: mapExtent.max_lat,
            lon: mapExtent.min_lon
          },
          bottom_right: {
            lat: mapExtent.min_lat,
            lon: mapExtent.max_lon
          }
        }
      }
    });
  });

  it('should return elasticsearch geo_shape filter for geo_shape field', () => {
    const filter = createExtentFilter(mapExtent, geoFieldName, 'geo_shape');
    expect(filter).toEqual({
      geo_shape: {
        [geoFieldName]: {
          shape: {
            type: 'envelope',
            coordinates: [
              [mapExtent.min_lon, mapExtent.max_lat],
              [mapExtent.max_lon, mapExtent.min_lat]
            ]
          },
          relation: 'INTERSECTS'
        }
      }
    });
  });

  it('should clamp longitudes to -180 to 180', () => {
    const mapExtent = {
      max_lat: 39,
      max_lon: 209,
      min_lat: 35,
      min_lon: -191,
    };
    const filter = createExtentFilter(mapExtent, geoFieldName, 'geo_shape');
    expect(filter).toEqual({
      geo_shape: {
        [geoFieldName]: {
          shape: {
            type: 'envelope',
            coordinates: [
              [-180, mapExtent.max_lat],
              [180, mapExtent.min_lat]
            ]
          },
          relation: 'INTERSECTS'
        }
      }
    });
  });
});

describe('convertMapExtentToEnvelope', () => {
  it('should convert bounds to envelope', () => {
    const bounds = {
      max_lat: 65.98468,
      max_lon: -162.71869,
      min_lat: 60.97598,
      min_lon: -174.59527,
    };
    expect(convertMapExtentToEnvelope(bounds)).toEqual({
      "type": "envelope",
      "coordinates": [
        [-174.59527, 65.98468], [-162.71869, 60.97598]
      ]
    });
  });

  it('should clamp longitudes to -180 to 180', () => {
    const bounds = {
      max_lat: 85.05113,
      max_lon: 209.55801,
      min_lat: -85.05113,
      min_lon: -454.84711,
    };
    expect(convertMapExtentToEnvelope(bounds)).toEqual({
      "type": "envelope",
      "coordinates": [
        [-180, 85.05113], [180, -85.05113]
      ]
    });
  });

  it('should split bounds that cross dateline(east to west)', () => {
    const bounds = {
      max_lat: 66.01959,
      max_lon: 190.11434,
      min_lat: 61.0176,
      min_lon: 169.35168,
    };
    expect(convertMapExtentToEnvelope(bounds)).toEqual([
      {
        "type": "envelope",
        "coordinates": [
          [169.35168, 66.01959], [180, 61.0176]
        ]
      },
      {
        "type": "envelope",
        "coordinates": [
          [-180, 66.01959], [-169.88566, 61.0176]
        ]
      },
    ]);
  });

  it('should split bounds that cross dateline(west to east)', () => {
    const bounds = {
      max_lat: 14.29261,
      max_lon: -159.0253,
      min_lat: -18.0925,
      min_lon: -193.69868,
    };
    expect(convertMapExtentToEnvelope(bounds)).toEqual([
      {
        "type": "envelope",
        "coordinates": [
          [166.30132, 14.29261], [180, -18.0925]
        ]
      },
      {
        "type": "envelope",
        "coordinates": [
          [-180, 14.29261], [-159.0253, -18.0925]
        ]
      },
    ]);
  });
});
