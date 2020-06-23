/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
jest.mock('../../../kibana_services', () => {});
jest.mock('ui/new_platform');

import { ESGeoGridSource } from './es_geo_grid_source';
import { GRID_RESOLUTION, RENDER_AS, SOURCE_TYPES } from '../../../../common/constants';

describe('ESGeoGridSource', () => {
  const geogridSource = new ESGeoGridSource(
    {
      id: 'foobar',
      indexPatternId: 'fooIp',
      geoField: 'bar',
      metrics: [],
      resolution: GRID_RESOLUTION.COARSE,
      type: SOURCE_TYPES.ES_GEO_GRID,
      requestType: RENDER_AS.HEATMAP,
    },
    {}
  );

  describe('getGridResolution', () => {
    it('should echo gridResoltuion', () => {
      expect(geogridSource.getGridResolution()).toBe(GRID_RESOLUTION.COARSE);
    });
  });

  describe('getGeoGridPrecision', () => {
    it('should clamp geo-grid derived zoom to max geotile level supported by ES', () => {
      expect(geogridSource.getGeoGridPrecision(29)).toBe(29);
    });

    it('should use heuristic to derive precision', () => {
      expect(geogridSource.getGeoGridPrecision(10)).toBe(12);
    });
  });
});
