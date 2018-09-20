/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  hitsToGeoJson,
  geoPointToGeometry,
  geoShapeToGeometry,
} from './elasticsearch_geo_utils';

describe('hitsToGeoJson', () => {
  const geoFieldName = 'location';

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
