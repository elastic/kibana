/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SCALING_TYPES, SOURCE_TYPES } from '../../../../common/constants';
import { BlendedVectorLayer } from './blended_vector_layer';
// @ts-expect-error
import { ESSearchSource } from '../../sources/es_search_source';
import { ESGeoGridSourceDescriptor } from '../../../../common/descriptor_types';

jest.mock('../../../kibana_services', () => {
  return {
    getIsDarkMode() {
      return false;
    },
  };
});

const mapColors: string[] = [];

const notClusteredDataRequest = {
  data: { isSyncClustered: false },
  dataId: 'ACTIVE_COUNT_DATA_ID',
};

const clusteredDataRequest = {
  data: { isSyncClustered: true },
  dataId: 'ACTIVE_COUNT_DATA_ID',
};

const documentSourceDescriptor = ESSearchSource.createDescriptor({
  geoField: 'myGeoField',
  indexPatternId: 'myIndexPattern',
  scalingType: SCALING_TYPES.CLUSTERS,
});

describe('getSource', () => {
  describe('isClustered: true', () => {
    test('should return cluster source', async () => {
      const blendedVectorLayer = new BlendedVectorLayer({
        source: new ESSearchSource(documentSourceDescriptor),
        layerDescriptor: BlendedVectorLayer.createDescriptor(
          {
            sourceDescriptor: documentSourceDescriptor,
            __dataRequests: [clusteredDataRequest],
          },
          mapColors
        ),
      });

      const source = blendedVectorLayer.getSource();
      expect(source.cloneDescriptor().type).toBe(SOURCE_TYPES.ES_GEO_GRID);
    });

    test('cluster source applyGlobalQuery should be true when document source applyGlobalQuery is true', async () => {
      const blendedVectorLayer = new BlendedVectorLayer({
        source: new ESSearchSource(documentSourceDescriptor),
        layerDescriptor: BlendedVectorLayer.createDescriptor(
          {
            sourceDescriptor: documentSourceDescriptor,
            __dataRequests: [clusteredDataRequest],
          },
          mapColors
        ),
      });

      const source = blendedVectorLayer.getSource();
      expect((source.cloneDescriptor() as ESGeoGridSourceDescriptor).applyGlobalQuery).toBe(true);
    });

    test('cluster source applyGlobalQuery should be false when document source applyGlobalQuery is false', async () => {
      const blendedVectorLayer = new BlendedVectorLayer({
        source: new ESSearchSource({
          ...documentSourceDescriptor,
          applyGlobalQuery: false,
        }),
        layerDescriptor: BlendedVectorLayer.createDescriptor(
          {
            sourceDescriptor: documentSourceDescriptor,
            __dataRequests: [clusteredDataRequest],
          },
          mapColors
        ),
      });

      const source = blendedVectorLayer.getSource();
      expect((source.cloneDescriptor() as ESGeoGridSourceDescriptor).applyGlobalQuery).toBe(false);
    });
  });

  describe('isClustered: false', () => {
    test('should return document source', async () => {
      const blendedVectorLayer = new BlendedVectorLayer({
        source: new ESSearchSource(documentSourceDescriptor),
        layerDescriptor: BlendedVectorLayer.createDescriptor(
          {
            sourceDescriptor: documentSourceDescriptor,
            __dataRequests: [notClusteredDataRequest],
          },
          mapColors
        ),
      });

      const source = blendedVectorLayer.getSource();
      expect(source.cloneDescriptor().type).toBe(SOURCE_TYPES.ES_SEARCH);
    });
  });
});

describe('cloneDescriptor', () => {
  describe('isClustered: true', () => {
    test('Cloned layer descriptor sourceDescriptor should be document source', async () => {
      const blendedVectorLayer = new BlendedVectorLayer({
        source: new ESSearchSource(documentSourceDescriptor),
        layerDescriptor: BlendedVectorLayer.createDescriptor(
          {
            sourceDescriptor: documentSourceDescriptor,
            __dataRequests: [clusteredDataRequest],
          },
          mapColors
        ),
      });

      const clonedLayerDescriptor = await blendedVectorLayer.cloneDescriptor();
      expect(clonedLayerDescriptor.sourceDescriptor!.type).toBe(SOURCE_TYPES.ES_SEARCH);
      expect(clonedLayerDescriptor.label).toBe('Clone of myIndexPattern');
    });
  });

  describe('isClustered: false', () => {
    test('Cloned layer descriptor sourceDescriptor should be document source', async () => {
      const blendedVectorLayer = new BlendedVectorLayer({
        source: new ESSearchSource(documentSourceDescriptor),
        layerDescriptor: BlendedVectorLayer.createDescriptor(
          {
            sourceDescriptor: documentSourceDescriptor,
            __dataRequests: [notClusteredDataRequest],
          },
          mapColors
        ),
      });

      const clonedLayerDescriptor = await blendedVectorLayer.cloneDescriptor();
      expect(clonedLayerDescriptor.sourceDescriptor!.type).toBe(SOURCE_TYPES.ES_SEARCH);
      expect(clonedLayerDescriptor.label).toBe('Clone of myIndexPattern');
    });
  });
});
