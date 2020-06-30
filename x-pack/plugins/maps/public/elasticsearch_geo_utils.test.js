/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('ui/new_platform');

jest.mock('./kibana_services', () => {
  return {
    SPATIAL_FILTER_TYPE: 'spatial_filter',
  };
});

import {
  hitsToGeoJson,
  geoPointToGeometry,
  geoShapeToGeometry,
  createExtentFilter,
  roundCoordinates,
  extractFeaturesFromFilters,
  makeESBbox,
} from './elasticsearch_geo_utils';
import { indexPatterns } from '../../../../src/plugins/data/public';

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
          [geoFieldName]: '20,100',
        },
      },
      {
        _id: 'doc2',
        _index: 'index1',
        _source: {
          [geoFieldName]: '30,110',
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
        _source: {
          [geoFieldName]: '20,100',
        },
      },
      {
        _source: {},
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
          [geoFieldName]: '20,100',
          myField: 8,
        },
        fields: {
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
        _source: {
          [geoFieldName]: ['20,100', '30,110'],
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

  it('Should convert epoch_millis value from string to integer', () => {
    const hits = [
      {
        _id: 'doc1',
        _index: 'index1',
        _source: {
          [geoFieldName]: '20,100',
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
    const indexPatternMock = {
      fields: {
        getByName: (name) => {
          const fields = {
            ['my.location']: {
              type: 'geo_point',
            },
          };
          return fields[name];
        },
      },
    };
    const indexPatternFlattenHit = indexPatterns.flattenHitWrapper(indexPatternMock);

    it('Should handle geoField being an object', () => {
      const hits = [
        {
          _source: {
            my: {
              location: '20,100',
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
          _source: {
            ['my.location']: '20,100',
          },
        },
      ];
      const geojson = hitsToGeoJson(hits, indexPatternFlattenHit, 'my.location', 'geo_point', []);
      expect(geojson.features[0].geometry).toEqual({
        coordinates: [100, 20],
        type: 'Point',
      });
    });
  });
});

describe('geoPointToGeometry', () => {
  const lat = 41.12;
  const lon = -71.34;

  it('Should convert single docvalue_field', () => {
    const value = `${lat},${lon}`;
    const points = [];
    geoPointToGeometry(value, points);
    expect(points.length).toBe(1);
    expect(points[0].type).toBe('Point');
    expect(points[0].coordinates).toEqual([lon, lat]);
  });

  it('Should convert multiple docvalue_fields', () => {
    const lat2 = 30;
    const lon2 = -60;
    const value = [`${lat},${lon}`, `${lat2},${lon2}`];
    const points = [];
    geoPointToGeometry(value, points);
    expect(points.length).toBe(2);
    expect(points[0].coordinates).toEqual([lon, lat]);
    expect(points[1].coordinates).toEqual([lon2, lat2]);
  });
});

describe('geoShapeToGeometry', () => {
  it('Should convert value stored as geojson', () => {
    const coordinates = [
      [-77.03653, 38.897676],
      [-77.009051, 38.889939],
    ];
    const value = {
      type: 'linestring',
      coordinates: coordinates,
    };
    const shapes = [];
    geoShapeToGeometry(value, shapes);
    expect(shapes.length).toBe(1);
    expect(shapes[0].type).toBe('LineString');
    expect(shapes[0].coordinates).toEqual(coordinates);
  });

  it('Should convert array of values', () => {
    const linestringCoordinates = [
      [-77.03653, 38.897676],
      [-77.009051, 38.889939],
    ];
    const pointCoordinates = [125.6, 10.1];
    const value = [
      {
        type: 'linestring',
        coordinates: linestringCoordinates,
      },
      {
        type: 'point',
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

  it('Should convert wkt shapes to geojson', () => {
    const pointWkt = 'POINT (32 40)';
    const linestringWkt = 'LINESTRING (50 60, 70 80)';

    const shapes = [];
    geoShapeToGeometry(pointWkt, shapes);
    geoShapeToGeometry(linestringWkt, shapes);

    expect(shapes.length).toBe(2);
    expect(shapes[0]).toEqual({
      coordinates: [32, 40],
      type: 'Point',
    });
    expect(shapes[1]).toEqual({
      coordinates: [
        [50, 60],
        [70, 80],
      ],
      type: 'LineString',
    });
  });
});

describe('createExtentFilter', () => {
  describe('geo_point field', () => {
    it('should return elasticsearch geo_bounding_box filter for geo_point field', () => {
      const mapExtent = {
        maxLat: 39,
        maxLon: -83,
        minLat: 35,
        minLon: -89,
      };
      const filter = createExtentFilter(mapExtent, geoFieldName, 'geo_point');
      expect(filter).toEqual({
        geo_bounding_box: {
          location: {
            top_left: [-89, 39],
            bottom_right: [-83, 35],
          },
        },
      });
    });

    it('should clamp longitudes to -180 to 180 and latitudes to -90 to 90', () => {
      const mapExtent = {
        maxLat: 120,
        maxLon: 200,
        minLat: -100,
        minLon: -190,
      };
      const filter = createExtentFilter(mapExtent, geoFieldName, 'geo_point');
      expect(filter).toEqual({
        geo_bounding_box: {
          location: {
            top_left: [-180, 89],
            bottom_right: [180, -89],
          },
        },
      });
    });

    it('should make left longitude greater then right longitude when area crosses 180 meridian east to west', () => {
      const mapExtent = {
        maxLat: 39,
        maxLon: 200,
        minLat: 35,
        minLon: 100,
      };
      const filter = createExtentFilter(mapExtent, geoFieldName, 'geo_point');
      const leftLon = filter.geo_bounding_box.location.top_left[0];
      const rightLon = filter.geo_bounding_box.location.bottom_right[0];
      expect(leftLon).toBeGreaterThan(rightLon);
      expect(filter).toEqual({
        geo_bounding_box: {
          location: {
            top_left: [100, 39],
            bottom_right: [-160, 35],
          },
        },
      });
    });

    it('should make left longitude greater then right longitude when area crosses 180 meridian west to east', () => {
      const mapExtent = {
        maxLat: 39,
        maxLon: -100,
        minLat: 35,
        minLon: -200,
      };
      const filter = createExtentFilter(mapExtent, geoFieldName, 'geo_point');
      const leftLon = filter.geo_bounding_box.location.top_left[0];
      const rightLon = filter.geo_bounding_box.location.bottom_right[0];
      expect(leftLon).toBeGreaterThan(rightLon);
      expect(filter).toEqual({
        geo_bounding_box: {
          location: {
            top_left: [160, 39],
            bottom_right: [-100, 35],
          },
        },
      });
    });
  });

  describe('geo_shape field', () => {
    it('should return elasticsearch geo_shape filter', () => {
      const mapExtent = {
        maxLat: 39,
        maxLon: -83,
        minLat: 35,
        minLon: -89,
      };
      const filter = createExtentFilter(mapExtent, geoFieldName, 'geo_shape');
      expect(filter).toEqual({
        geo_shape: {
          location: {
            relation: 'INTERSECTS',
            shape: {
              coordinates: [
                [
                  [-89, 39],
                  [-89, 35],
                  [-83, 35],
                  [-83, 39],
                  [-89, 39],
                ],
              ],
              type: 'Polygon',
            },
          },
        },
      });
    });

    it('should clamp longitudes to -180 to 180 when lonitude wraps globe', () => {
      const mapExtent = {
        maxLat: 39,
        maxLon: 209,
        minLat: 35,
        minLon: -191,
      };
      const filter = createExtentFilter(mapExtent, geoFieldName, 'geo_shape');
      expect(filter).toEqual({
        geo_shape: {
          location: {
            relation: 'INTERSECTS',
            shape: {
              coordinates: [
                [
                  [-180, 39],
                  [-180, 35],
                  [180, 35],
                  [180, 39],
                  [-180, 39],
                ],
              ],
              type: 'Polygon',
            },
          },
        },
      });
    });
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

describe('extractFeaturesFromFilters', () => {
  it('should ignore non-spatial filers', () => {
    const phraseFilter = {
      meta: {
        alias: null,
        disabled: false,
        index: '90943e30-9a47-11e8-b64d-95841ca0b247',
        key: 'machine.os',
        negate: false,
        params: {
          query: 'ios',
        },
        type: 'phrase',
      },
      query: {
        match_phrase: {
          'machine.os': 'ios',
        },
      },
    };
    expect(extractFeaturesFromFilters([phraseFilter])).toEqual([]);
  });

  it('should convert geo_distance filter to feature', () => {
    const spatialFilter = {
      geo_distance: {
        distance: '1096km',
        'geo.coordinates': [-89.87125, 53.49454],
      },
      meta: {
        alias: 'geo.coordinates within 1096km of -89.87125,53.49454',
        disabled: false,
        index: '90943e30-9a47-11e8-b64d-95841ca0b247',
        key: 'geo.coordinates',
        negate: false,
        type: 'spatial_filter',
        value: '',
      },
    };

    const features = extractFeaturesFromFilters([spatialFilter]);
    expect(features[0].geometry.coordinates[0][0]).toEqual([-89.87125, 63.35109118642093]);
    expect(features[0].properties).toEqual({
      filter: 'geo.coordinates within 1096km of -89.87125,53.49454',
    });
  });

  it('should convert geo_shape filter to feature', () => {
    const spatialFilter = {
      geo_shape: {
        'geo.coordinates': {
          relation: 'INTERSECTS',
          shape: {
            coordinates: [
              [
                [-101.21639, 48.1413],
                [-101.21639, 41.84905],
                [-90.95149, 41.84905],
                [-90.95149, 48.1413],
                [-101.21639, 48.1413],
              ],
            ],
            type: 'Polygon',
          },
        },
        ignore_unmapped: true,
      },
      meta: {
        alias: 'geo.coordinates in bounds',
        disabled: false,
        index: '90943e30-9a47-11e8-b64d-95841ca0b247',
        key: 'geo.coordinates',
        negate: false,
        type: 'spatial_filter',
        value: '',
      },
    };

    expect(extractFeaturesFromFilters([spatialFilter])).toEqual([
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-101.21639, 48.1413],
              [-101.21639, 41.84905],
              [-90.95149, 41.84905],
              [-90.95149, 48.1413],
              [-101.21639, 48.1413],
            ],
          ],
        },
        properties: {
          filter: 'geo.coordinates in bounds',
        },
      },
    ]);
  });

  it('should ignore geo_shape filter with pre-index shape', () => {
    const spatialFilter = {
      geo_shape: {
        'geo.coordinates': {
          indexed_shape: {
            id: 's5gldXEBkTB2HMwpC8y0',
            index: 'world_countries_v1',
            path: 'coordinates',
          },
          relation: 'INTERSECTS',
        },
        ignore_unmapped: true,
      },
      meta: {
        alias: 'geo.coordinates in multipolygon',
        disabled: false,
        index: '90943e30-9a47-11e8-b64d-95841ca0b247',
        key: 'geo.coordinates',
        negate: false,
        type: 'spatial_filter',
        value: '',
      },
    };

    expect(extractFeaturesFromFilters([spatialFilter])).toEqual([]);
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
