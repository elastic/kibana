/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SCALING_TYPES } from '../../../../common/constants';

jest.mock('../../../kibana_services');
jest.mock('ui/new_platform');

import { ESSearchSource } from './es_search_source';

describe('ESSearchSource', () => {
  it('constructor', () => {
    const esSearchSource = new ESSearchSource({}, null);
    expect(esSearchSource instanceof ESSearchSource).toBe(true);
  });

  describe('ITiledSingleLayerVectorSource', () => {
    it('mb-source params', () => {
      const esSearchSource = new ESSearchSource({}, null);
      expect(esSearchSource.getMinZoom()).toBe(0);
      expect(esSearchSource.getMaxZoom()).toBe(24);
      expect(esSearchSource.getLayerName()).toBe('source_layer');
    });
  });

  describe('isFilterByMapBounds', () => {
    it('default', () => {
      const esSearchSource = new ESSearchSource({}, null);
      expect(esSearchSource.isFilterByMapBounds()).toBe(true);
    });
    it('mvt', () => {
      const esSearchSource = new ESSearchSource({ scalingType: SCALING_TYPES.MVT }, null);
      expect(esSearchSource.isFilterByMapBounds()).toBe(false);
    });
  });

  describe('getJoinsDisabledReason', () => {
    it('default', () => {
      const esSearchSource = new ESSearchSource({}, null);
      expect(esSearchSource.getJoinsDisabledReason()).toBe(null);
    });
    it('mvt', () => {
      const esSearchSource = new ESSearchSource({ scalingType: SCALING_TYPES.MVT }, null);
      expect(esSearchSource.getJoinsDisabledReason()).toBe(
        'Joins are not supported when scaling by mvt vector tiles'
      );
    });
  });

  describe('getFields', () => {
    it('default', () => {
      const esSearchSource = new ESSearchSource({}, null);
      const docField = esSearchSource.createField('prop1');
      expect(docField.canReadFromGeoJson()).toBe(true);
    });
    it('mvt', () => {
      const esSearchSource = new ESSearchSource({ scalingType: SCALING_TYPES.MVT }, null);
      const docField = esSearchSource.createField('prop1');
      expect(docField.canReadFromGeoJson()).toBe(false);
    });
  });
});
