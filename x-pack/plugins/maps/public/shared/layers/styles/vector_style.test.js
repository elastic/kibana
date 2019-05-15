/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VectorStyle } from './vector_style';
import { DataRequest } from '../util/data_request';

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
    });
  });
});

describe('pluckStyleMetaFromSourceDataRequest', () => {

  describe('isPointsOnly', () => {
    it('Should identify when feature collection only contains points', () => {
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
                type: 'Point'
              },
              properties: {}
            }
          ],
        }
      });
      const vectorStyle = new VectorStyle({});

      const featuresMeta = vectorStyle.pluckStyleMetaFromSourceDataRequest(sourceDataRequest);
      expect(featuresMeta).toEqual({ isPointsOnly: true });
    });

    it('Should identify when feature collection contains features other than points', () => {
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
                type: 'Polygon'
              },
              properties: {}
            }
          ],
        }
      });
      const vectorStyle = new VectorStyle({});

      const featuresMeta = vectorStyle.pluckStyleMetaFromSourceDataRequest(sourceDataRequest);
      expect(featuresMeta).toEqual({ isPointsOnly: false });
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

    it('Should not extract scaled field range when scaled field has not values', () => {
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
      });

      const featuresMeta = vectorStyle.pluckStyleMetaFromSourceDataRequest(sourceDataRequest);
      expect(featuresMeta).toEqual({ isPointsOnly: true });
    });

    it('Should extract scaled field range', () => {
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
      });

      const featuresMeta = vectorStyle.pluckStyleMetaFromSourceDataRequest(sourceDataRequest);
      expect(featuresMeta).toEqual({
        isPointsOnly: true,
        myDynamicField: {
          delta: 9,
          max: 10,
          min: 1
        }
      });
    });
  });

});
