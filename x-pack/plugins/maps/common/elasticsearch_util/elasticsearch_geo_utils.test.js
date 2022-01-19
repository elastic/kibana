/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  hitsToGeoJson,
  geoPointToGeometry,
  geoShapeToGeometry,
  roundCoordinates,
  makeESBbox,
  scaleBounds,
} from './elasticsearch_geo_utils';
import _ from 'lodash';

const geoFieldName = 'location';

const flattenHitMock = (hit) => {
  const properties = {};
  for (const fieldName in hit._source) {
    if (hit._source.hasOwnProperty(fieldName)) {
      properties[fieldName] = hit._source[fieldName];
    }
  }
  for (const fieldName in hit.fields) {
    if (hit.fields.hasOwnProperty(fieldName)) {
      properties[fieldName] = hit.fields[fieldName];
    }
  }
  properties._id = hit._id;
  properties._index = hit._index;

  return properties;
};

describe('hitsToGeoJson', () => {
  it('Should convert elasitcsearch hits to geojson', () => {
    const hits = [
      {
        _id: 'doc1',
        _index: 'index1',
        fields: {
          [geoFieldName]: [
            {
              type: 'Point',
              coordinates: [100, 20],
            },
          ],
        },
      },
      {
        _id: 'doc2',
        _index: 'index1',
        fields: {
          [geoFieldName]: [
            {
              type: 'Point',
              coordinates: [110, 30],
            },
          ],
        },
      },
    ];
    const geojson = hitsToGeoJson(hits, flattenHitMock, geoFieldName, 'geo_point', []);
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features.length).toBe(2);
    expect(geojson.features[0]).toEqual({
      geometry: {
        coordinates: [100, 20],
        type: 'Point',
      },
      id: 'index1:doc1:0',
      properties: {
        _id: 'doc1',
        _index: 'index1',
      },
      type: 'Feature',
    });
  });

  it('Should handle documents where geoField is not populated', () => {
    const hits = [
      {
        fields: {
          [geoFieldName]: [
            {
              type: 'Point',
              coordinates: [100, 20],
            },
          ],
        },
      },
      {
        fields: {},
      },
    ];
    const geojson = hitsToGeoJson(hits, flattenHitMock, geoFieldName, 'geo_point', []);
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features.length).toBe(1);
  });

  it('Should populate properties from hit', () => {
    const hits = [
      {
        _source: {
          myField: 8,
        },
        fields: {
          [geoFieldName]: [
            {
              type: 'Point',
              coordinates: [100, 20],
            },
          ],
          myScriptedField: 10,
        },
      },
    ];
    const geojson = hitsToGeoJson(hits, flattenHitMock, geoFieldName, 'geo_point', []);
    expect(geojson.features.length).toBe(1);
    const feature = geojson.features[0];
    expect(feature.properties.myField).toBe(8);
  });

  it('Should create feature per item when geometry value is an array', () => {
    const hits = [
      {
        _id: 'doc1',
        _index: 'index1',
        fields: {
          [geoFieldName]: [
            {
              type: 'Point',
              coordinates: [100, 20],
            },
            {
              type: 'Point',
              coordinates: [110, 30],
            },
          ],
          myField: 8,
        },
      },
    ];
    const geojson = hitsToGeoJson(hits, flattenHitMock, geoFieldName, 'geo_point', []);
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features.length).toBe(2);
    expect(geojson.features[0]).toEqual({
      geometry: {
        coordinates: [100, 20],
        type: 'Point',
      },
      id: 'index1:doc1:0',
      properties: {
        _id: 'doc1',
        _index: 'index1',
        myField: 8,
      },
      type: 'Feature',
    });
    expect(geojson.features[1]).toEqual({
      geometry: {
        coordinates: [110, 30],
        type: 'Point',
      },
      id: 'index1:doc1:1',
      properties: {
        _id: 'doc1',
        _index: 'index1',
        myField: 8,
      },
      type: 'Feature',
    });
  });

  it('Should create feature per item when geometry value is a geometry-collection', () => {
    const hits = [
      {
        _id: 'doc1',
        _index: 'index1',
        fields: {
          [geoFieldName]: {
            type: 'GeometryCollection',
            geometries: [
              {
                type: 'geometrycollection',
                geometries: [
                  {
                    type: 'Point',
                    coordinates: [0, 0],
                  },
                ],
              },
              {
                type: 'LineString',
                coordinates: [
                  [0, 0],
                  [1, 1],
                ],
              },
            ],
          },
          myField: 8,
        },
      },
    ];
    const geojson = hitsToGeoJson(hits, flattenHitMock, geoFieldName, 'geo_shape', []);
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features.length).toBe(2);
    expect(geojson.features[0]).toEqual({
      geometry: {
        coordinates: [0, 0],
        type: 'Point',
      },
      id: 'index1:doc1:0',
      properties: {
        _id: 'doc1',
        _index: 'index1',
        myField: 8,
      },
      type: 'Feature',
    });
    expect(geojson.features[1]).toEqual({
      geometry: {
        coordinates: [
          [0, 0],
          [1, 1],
        ],
        type: 'LineString',
      },
      id: 'index1:doc1:1',
      properties: {
        _id: 'doc1',
        _index: 'index1',
        myField: 8,
      },
      type: 'Feature',
    });
  });

  it('Should convert epoch_millis value from string to integer', () => {
    const hits = [
      {
        _id: 'doc1',
        _index: 'index1',
        fields: {
          [geoFieldName]: {
            type: 'Point',
            coordinates: [100, 20],
          },
          myDateField: '1587156257081',
        },
      },
    ];
    const geojson = hitsToGeoJson(hits, flattenHitMock, geoFieldName, 'geo_point', ['myDateField']);
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features.length).toBe(1);
    expect(geojson.features[0].properties.myDateField).toBe(1587156257081);
  });

  describe('dot in geoFieldName', () => {
    // This essentially should test the implmentation of index-pattern.flattenHit, rather than anything in geo_utils.
    // Leaving this here for reference.
    const geoFieldName = 'my.location';
    const indexPatternFlattenHit = (hit) => {
      return {
        [geoFieldName]: _.get(hit.fields, geoFieldName),
      };
    };

    it('Should handle geoField being an object', () => {
      const hits = [
        {
          fields: {
            my: {
              location: [
                {
                  type: 'Point',
                  coordinates: [100, 20],
                },
              ],
            },
          },
        },
      ];
      const geojson = hitsToGeoJson(hits, indexPatternFlattenHit, 'my.location', 'geo_point', []);
      expect(geojson.features[0].geometry).toEqual({
        coordinates: [100, 20],
        type: 'Point',
      });
    });

    it('Should handle geoField containing dot in the name', () => {
      const hits = [
        {
          fields: {
            ['my.location']: [
              {
                type: 'Point',
                coordinates: [100, 20],
              },
            ],
          },
        },
      ];
      const geojson = hitsToGeoJson(hits, indexPatternFlattenHit, 'my.location', 'geo_point', []);
      expect(geojson.features[0].geometry).toEqual({
        coordinates: [100, 20],
        type: 'Point',
      });
    });

    it('Should not modify results of flattenHit', () => {
      const geoFieldName = 'location';
      const cachedProperities = {
        [geoFieldName]: [
          {
            type: 'Point',
            coordinates: [100, 20],
          },
        ],
      };
      const cachedFlattenHit = () => {
        return cachedProperities;
      };
      const hits = [
        {
          fields: {
            [geoFieldName]: [
              {
                type: 'Point',
                coordinates: [100, 20],
              },
            ],
          },
        },
      ];
      const geojson = hitsToGeoJson(hits, cachedFlattenHit, geoFieldName, 'geo_point', []);
      expect(cachedProperities.hasOwnProperty('location')).toBe(true);
      expect(geojson.features[0].properties).toEqual({});
    });
  });
});

describe('geoPointToGeometry', () => {
  const lat = 41.12;
  const lon = -71.34;

  it('Should convert value', () => {
    const value = {
      type: 'Point',
      coordinates: [lon, lat],
    };
    const points = [];
    geoPointToGeometry(value, points);
    expect(points.length).toBe(1);
    expect(points[0].type).toBe('Point');
    expect(points[0].coordinates).toEqual([lon, lat]);
  });

  it('Should convert array of values', () => {
    const lat2 = 30;
    const lon2 = -60;
    const value = [
      {
        type: 'Point',
        coordinates: [lon, lat],
      },
      {
        type: 'Point',
        coordinates: [lon2, lat2],
      },
    ];
    const points = [];
    geoPointToGeometry(value, points);
    expect(points.length).toBe(2);
    expect(points[0].coordinates).toEqual([lon, lat]);
    expect(points[1].coordinates).toEqual([lon2, lat2]);
  });
});

describe('geoShapeToGeometry', () => {
  it('Should convert value', () => {
    const coordinates = [
      [-77.03653, 38.897676],
      [-77.009051, 38.889939],
    ];
    const value = {
      type: 'LineString',
      coordinates: coordinates,
    };
    const shapes = [];
    geoShapeToGeometry(value, shapes);
    expect(shapes.length).toBe(1);
    expect(shapes[0].type).toBe('LineString');
    expect(shapes[0].coordinates).toEqual(coordinates);
  });

  it('Should convert envelope to geojson', () => {
    const coordinates = [
      [100.0, 1.0],
      [101.0, 0.0],
    ];
    const value = {
      type: 'Envelope',
      coordinates: coordinates,
    };
    const shapes = [];
    geoShapeToGeometry(value, shapes);
    expect(shapes.length).toBe(1);
    expect(shapes[0].type).toBe('Polygon');
    expect(shapes[0].coordinates).toEqual([
      [
        [100, 1],
        [100, 0],
        [101, 0],
        [101, 1],
        [100, 1],
      ],
    ]);
  });

  it('Should convert array of values', () => {
    const linestringCoordinates = [
      [-77.03653, 38.897676],
      [-77.009051, 38.889939],
    ];
    const pointCoordinates = [125.6, 10.1];
    const value = [
      {
        type: 'LineString',
        coordinates: linestringCoordinates,
      },
      {
        type: 'Point',
        coordinates: pointCoordinates,
      },
    ];
    const shapes = [];
    geoShapeToGeometry(value, shapes);
    expect(shapes.length).toBe(2);
    expect(shapes[0].type).toBe('LineString');
    expect(shapes[0].coordinates).toEqual(linestringCoordinates);
    expect(shapes[1].type).toBe('Point');
    expect(shapes[1].coordinates).toEqual(pointCoordinates);
  });
});

describe('roundCoordinates', () => {
  it('should set coordinates precision', () => {
    const coordinates = [
      [110.21515290475513, 40.23193047044205],
      [-105.30620093073654, 40.23193047044205],
      [-105.30620093073654, 30.647128842617803],
    ];
    roundCoordinates(coordinates);
    expect(coordinates).toEqual([
      [110.21515, 40.23193],
      [-105.3062, 40.23193],
      [-105.3062, 30.64713],
    ]);
  });
});

describe('makeESBbox', () => {
  it('Should invert Y-axis', () => {
    const bbox = makeESBbox({
      minLon: 10,
      maxLon: 20,
      minLat: 0,
      maxLat: 1,
    });
    expect(bbox).toEqual({ bottom_right: [20, 0], top_left: [10, 1] });
  });

  it('Should snap to 360 width', () => {
    const bbox = makeESBbox({
      minLon: 10,
      maxLon: 400,
      minLat: 0,
      maxLat: 1,
    });
    expect(bbox).toEqual({ bottom_right: [180, 0], top_left: [-180, 1] });
  });

  it('Should clamp latitudes', () => {
    const bbox = makeESBbox({
      minLon: 10,
      maxLon: 400,
      minLat: -100,
      maxLat: 100,
    });
    expect(bbox).toEqual({ bottom_right: [180, -89], top_left: [-180, 89] });
  });

  it('Should swap West->East orientation to East->West orientation when crossing dateline (West extension)', () => {
    const bbox = makeESBbox({
      minLon: -190,
      maxLon: 20,
      minLat: -100,
      maxLat: 100,
    });
    expect(bbox).toEqual({ bottom_right: [20, -89], top_left: [170, 89] });
  });

  it('Should swap West->East orientation to East->West orientation when crossing dateline (West extension) (overrated)', () => {
    const bbox = makeESBbox({
      minLon: -190 + 360 + 360,
      maxLon: 20 + 360 + 360,
      minLat: -100,
      maxLat: 100,
    });
    expect(bbox).toEqual({ bottom_right: [20, -89], top_left: [170, 89] });
  });

  it('Should swap West->East orientation to East->West orientation when crossing dateline (east extension)', () => {
    const bbox = makeESBbox({
      minLon: 175,
      maxLon: 190,
      minLat: -100,
      maxLat: 100,
    });
    expect(bbox).toEqual({ bottom_right: [-170, -89], top_left: [175, 89] });
  });

  it('Should preserve West->East orientation when _not_ crossing dateline', () => {
    const bbox = makeESBbox({
      minLon: 20,
      maxLon: 170,
      minLat: -100,
      maxLat: 100,
    });
    expect(bbox).toEqual({ bottom_right: [170, -89], top_left: [20, 89] });
  });

  it('Should preserve West->East orientation when _not_ crossing dateline _and_ snap longitudes (west extension)', () => {
    const bbox = makeESBbox({
      minLon: -190,
      maxLon: -185,
      minLat: -100,
      maxLat: 100,
    });
    expect(bbox).toEqual({ bottom_right: [175, -89], top_left: [170, 89] });
  });

  it('Should preserve West->East orientation when _not_ crossing dateline _and_ snap longitudes (east extension)', () => {
    const bbox = makeESBbox({
      minLon: 185,
      maxLon: 190,
      minLat: -100,
      maxLat: 100,
    });
    expect(bbox).toEqual({ bottom_right: [-170, -89], top_left: [-175, 89] });
  });
});

describe('scaleBounds', () => {
  it('Should scale bounds', () => {
    const bounds = {
      maxLat: 10,
      maxLon: 100,
      minLat: 5,
      minLon: 95,
    };
    expect(scaleBounds(bounds, 0.5)).toEqual({
      maxLat: 12.5,
      maxLon: 102.5,
      minLat: 2.5,
      minLon: 92.5,
    });
  });
});
