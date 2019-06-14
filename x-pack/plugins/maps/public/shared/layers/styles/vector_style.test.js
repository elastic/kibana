/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VectorStyle } from './vector_style';
import { DataRequest } from '../util/data_request';
import { VECTOR_SHAPE_TYPES } from '../sources/vector_feature_types';

describe('getDescriptorWithMissingStylePropsRemoved', () => {
  const fieldName = 'doIStillExist';
  const properties = {
    fillColor: {
      type: VectorStyle.STYLE_TYPE.STATIC,
      options: {}
    },
    lineColor: {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options: {}
    },
    iconSize: {
      type: VectorStyle.STYLE_TYPE.DYNAMIC,
      options: {
        color: 'a color',
        field: { name: fieldName }
      }
    }
  };

  it('Should return no changes when next oridinal fields contain existing style property fields', () => {
    const vectorStyle = new VectorStyle({ properties });

    const nextOridinalFields = [
      { name: fieldName }
    ];
    const { hasChanges } = vectorStyle.getDescriptorWithMissingStylePropsRemoved(nextOridinalFields);
    expect(hasChanges).toBe(false);
  });

  it('Should clear missing fields when next oridinal fields do not contain existing style property fields', () => {
    const vectorStyle = new VectorStyle({ properties });

    const nextOridinalFields = [];
    const { hasChanges, nextStyleDescriptor } = vectorStyle.getDescriptorWithMissingStylePropsRemoved(nextOridinalFields);
    expect(hasChanges).toBe(true);
    expect(nextStyleDescriptor.properties).toEqual({
      fillColor: {
        options: {},
        type: 'STATIC',
      },
      iconSize: {
        options: {
          color: 'a color',
        },
        type: 'DYNAMIC',
      },
      lineColor: {
        options: {},
        type: 'DYNAMIC',
      },
      lineWidth: {
        options: {
          size: 1,
        },
        type: 'STATIC',
      },
      symbol: {
        options: {
          symbolId: 'airfield',
          symbolizeAs: 'circle',
        },
      },
    });
  });
});

describe('pluckStyleMetaFromSourceDataRequest', () => {

  const sourceMock = {
    getSupportedShapeTypes: () => {
      return Object.values(VECTOR_SHAPE_TYPES);
    }
  };

  describe('has features', () => {
    it('Should identify when feature collection only contains points', async () => {
      const sourceDataRequest = new DataRequest({
        data: {
          type: 'FeatureCollection',
          features: [
            {
              geometry: {
                type: 'Point'
              },
              properties: {}
            },
            {
              geometry: {
                type: 'MultiPoint'
              },
              properties: {}
            }
          ],
        }
      });
      const vectorStyle = new VectorStyle({}, sourceMock);

      const featuresMeta = await vectorStyle.pluckStyleMetaFromSourceDataRequest(sourceDataRequest);
      expect(featuresMeta.hasFeatureType).toEqual({
        LINE: false,
        POINT: true,
        POLYGON: false
      });
    });

    it('Should identify when feature collection only contains lines', async () => {
      const sourceDataRequest = new DataRequest({
        data: {
          type: 'FeatureCollection',
          features: [
            {
              geometry: {
                type: 'LineString'
              },
              properties: {}
            },
            {
              geometry: {
                type: 'MultiLineString'
              },
              properties: {}
            }
          ],
        }
      });
      const vectorStyle = new VectorStyle({}, sourceMock);

      const featuresMeta = await vectorStyle.pluckStyleMetaFromSourceDataRequest(sourceDataRequest);
      expect(featuresMeta.hasFeatureType).toEqual({
        LINE: true,
        POINT: false,
        POLYGON: false
      });
    });
  });

  describe('scaled field range', () => {
    const sourceDataRequest = new DataRequest({
      data: {
        type: 'FeatureCollection',
        features: [
          {
            geometry: {
              type: 'Point'
            },
            properties: {
              myDynamicField: 1
            }
          },
          {
            geometry: {
              type: 'Point'
            },
            properties: {
              myDynamicField: 10
            }
          }
        ],
      }
    });

    it('Should not extract scaled field range when scaled field has no values', async () => {
      const vectorStyle = new VectorStyle({
        properties: {
          fillColor: {
            type: VectorStyle.STYLE_TYPE.DYNAMIC,
            options: {
              field: {
                name: 'myDynamicFieldWithNoValues'
              }
            }
          }
        }
      }, sourceMock);

      const featuresMeta = await vectorStyle.pluckStyleMetaFromSourceDataRequest(sourceDataRequest);
      expect(featuresMeta.hasFeatureType).toEqual({
        LINE: false,
        POINT: true,
        POLYGON: false
      });
    });

    it('Should extract scaled field range', async () => {
      const vectorStyle = new VectorStyle({
        properties: {
          fillColor: {
            type: VectorStyle.STYLE_TYPE.DYNAMIC,
            options: {
              field: {
                name: 'myDynamicField'
              }
            }
          }
        }
      }, sourceMock);

      const featuresMeta = await vectorStyle.pluckStyleMetaFromSourceDataRequest(sourceDataRequest);
      expect(featuresMeta.myDynamicField).toEqual({
        delta: 9,
        max: 10,
        min: 1
      });
    });
  });

});

describe('checkIfOnlyFeatureType', () => {

  describe('source supports single feature type', () => {
    const sourceMock = {
      getSupportedShapeTypes: () => {
        return [VECTOR_SHAPE_TYPES.POINT];
      }
    };

    it('isPointsOnly should be true when source feature type only supports points', async () => {
      const vectorStyle = new VectorStyle({}, sourceMock);
      const isPointsOnly = await vectorStyle._getIsPointsOnly();
      expect(isPointsOnly).toBe(true);
    });

    it('isLineOnly should be false when source feature type only supports points', async () => {
      const vectorStyle = new VectorStyle({}, sourceMock);
      const isLineOnly = await vectorStyle._getIsLinesOnly();
      expect(isLineOnly).toBe(false);
    });
  });

  describe('source supports multiple feature types', () => {
    const sourceMock = {
      getSupportedShapeTypes: () => {
        return Object.values(VECTOR_SHAPE_TYPES);
      }
    };

    it('isPointsOnly should be true when data contains just points', async () => {
      const vectorStyle = new VectorStyle({
        __styleMeta: {
          hasFeatureType: {
            POINT: true,
            LINE: false,
            POLYGON: false
          }
        }
      }, sourceMock);
      const isPointsOnly = await vectorStyle._getIsPointsOnly();
      expect(isPointsOnly).toBe(true);
    });

    it('isPointsOnly should be false when data contains just lines', async () => {
      const vectorStyle = new VectorStyle({
        __styleMeta: {
          hasFeatureType: {
            POINT: false,
            LINE: true,
            POLYGON: false
          }
        }
      }, sourceMock);
      const isPointsOnly = await vectorStyle._getIsPointsOnly();
      expect(isPointsOnly).toBe(false);
    });

    it('isPointsOnly should be false when data contains points, lines, and polygons', async () => {
      const vectorStyle = new VectorStyle({
        __styleMeta: {
          hasFeatureType: {
            POINT: true,
            LINE: true,
            POLYGON: true
          }
        }
      }, sourceMock);
      const isPointsOnly = await vectorStyle._getIsPointsOnly();
      expect(isPointsOnly).toBe(false);
    });
  });

});
