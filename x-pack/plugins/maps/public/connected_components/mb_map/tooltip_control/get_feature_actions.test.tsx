/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MapGeoJSONFeature } from '@kbn/mapbox-gl';
import { getFeatureActions } from './get_feature_actions';
import { ESGeoGridSource } from '../../../classes/sources/es_geo_grid_source';
import { ESSearchSource } from '../../../classes/sources/es_search_source';
import { IVectorSource } from '../../../classes/sources/vector_source';
import { IVectorLayer } from '../../../classes/layers/vector_layer';
import { SOURCE_TYPES } from '../../../../common/constants';

const mbPolygonFeature = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [100.0, 0.0],
        [101.0, 0.0],
        [101.0, 1.0],
        [100.0, 1.0],
        [100.0, 0.0],
      ],
    ],
  },
  properties: {},
} as MapGeoJSONFeature;

describe('clusters', () => {
  test('should return "Filter by cluster" action for ESGeoGrid source', () => {
    const mockEsGeoGridSource = {
      getType: () => {
        return SOURCE_TYPES.ES_GEO_GRID;
      },
      isHex: () => {
        return false;
      },
    } as unknown as ESGeoGridSource;
    const actions = getFeatureActions({
      addFilters: async () => {},
      featureId: '9/146/195',
      geoFieldNames: ['location'],
      layer: {
        getSource: () => {
          return mockEsGeoGridSource;
        },
      } as unknown as IVectorLayer,
      mbFeature: mbPolygonFeature,
      onClose: () => {},
    });

    expect(actions.length).toBe(1);
    expect(actions[0].id).toBe('CLUSTER_FILTER_ACTION');
  });
});

describe('non clusters', () => {
  test('should not return any actions for non-polygon feature', () => {
    const mockEsGeoGridSource = {
      getType: () => {
        return SOURCE_TYPES.ES_SEARCH;
      },
    } as unknown as ESSearchSource;
    const actions = getFeatureActions({
      addFilters: async () => {},
      featureId: '9/146/195',
      geoFieldNames: ['location'],
      layer: {
        getSource: () => {
          return mockEsGeoGridSource;
        },
      } as unknown as IVectorLayer,
      mbFeature: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [100.0, 0.0],
        },
        properties: {},
      } as MapGeoJSONFeature,
      onClose: () => {},
    });

    expect(actions.length).toBe(0);
  });

  test('should return Pre-Indexed Shape "Filter by geometry" with action for ESSearchSource source', () => {
    const mockEsGeoGridSource = {
      getType: () => {
        return SOURCE_TYPES.ES_SEARCH;
      },
    } as unknown as ESSearchSource;
    const actions = getFeatureActions({
      addFilters: async () => {},
      featureId: 'doc1',
      geoFieldNames: ['location'],
      layer: {
        getSource: () => {
          return mockEsGeoGridSource;
        },
      } as unknown as IVectorLayer,
      mbFeature: mbPolygonFeature,
      onClose: () => {},
    });

    expect(actions.length).toBe(1);
    expect(actions[0].id).toBe('GEOMETRY_FILTER_ACTION');
    expect(actions[0].form).toMatchSnapshot();
  });

  test('should not return any actions for non ES vector tile source', () => {
    const mockEsGeoGridSource = {
      getType: () => {
        return SOURCE_TYPES.EMS_FILE;
      },
      isMvt: () => {
        return true;
      },
    } as unknown as IVectorSource;
    const actions = getFeatureActions({
      addFilters: async () => {},
      featureId: 'colorado',
      geoFieldNames: ['location'],
      layer: {
        getSource: () => {
          return mockEsGeoGridSource;
        },
      } as unknown as IVectorLayer,
      mbFeature: mbPolygonFeature,
      onClose: () => {},
    });

    expect(actions.length).toBe(0);
  });

  test('should return "Filter by geometry" with action for non ES geojson source', () => {
    const mockEsGeoGridSource = {
      getType: () => {
        return SOURCE_TYPES.EMS_FILE;
      },
      isMvt: () => {
        return false;
      },
    } as unknown as IVectorSource;
    const actions = getFeatureActions({
      addFilters: async () => {},
      featureId: 'colorado',
      geoFieldNames: ['location'],
      layer: {
        getFeatureById: () => {
          // In live instance, geometry would be pulled from geojson source and not from mbFeature
          return mbPolygonFeature.geometry;
        },
        getSource: () => {
          return mockEsGeoGridSource;
        },
      } as unknown as IVectorLayer,
      mbFeature: mbPolygonFeature,
      onClose: () => {},
    });

    expect(actions.length).toBe(1);
    expect(actions[0].id).toBe('GEOMETRY_FILTER_ACTION');
    expect(actions[0].form).toMatchSnapshot();
  });
});
