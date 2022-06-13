/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { VectorStyle } from './vector_style';
import { DataRequest } from '../../util/data_request';
import {
  FIELD_ORIGIN,
  STYLE_TYPE,
  VECTOR_SHAPE_TYPE,
  VECTOR_STYLES,
} from '../../../../common/constants';
import { MockField } from './properties/test_helpers/test_util';

jest.mock('../../../kibana_services');

class MockSource {
  constructor({ supportedShapeTypes } = {}) {
    this._supportedShapeTypes = supportedShapeTypes || Object.values(VECTOR_SHAPE_TYPE);
  }
  getSupportedShapeTypes() {
    return this._supportedShapeTypes;
  }
  getFieldByName(fieldName) {
    return new MockField({ fieldName });
  }
  createField({ fieldName }) {
    return new MockField({ fieldName });
  }
}

describe('getDescriptorWithUpdatedStyleProps', () => {
  const previousFieldName = 'doIStillExist';
  const mapColors = [];
  const layer = {};
  const customIcons = [];
  const properties = {
    fillColor: {
      type: STYLE_TYPE.STATIC,
      options: {},
    },
    lineColor: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        field: {
          name: previousFieldName,
          origin: FIELD_ORIGIN.SOURCE,
        },
      },
    },
    iconSize: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        minSize: 1,
        maxSize: 10,
        field: { name: previousFieldName, origin: FIELD_ORIGIN.SOURCE },
      },
    },
  };

  const previousFields = [new MockField({ fieldName: previousFieldName })];

  beforeEach(() => {
    require('../../../kibana_services').getUiSettings = () => ({
      get: jest.fn(),
    });
  });

  describe('When there is no mismatch in configuration', () => {
    it('Should return no changes when next ordinal fields contain existing style property fields', async () => {
      const vectorStyle = new VectorStyle({ properties }, new MockSource(), layer, customIcons);

      const nextFields = [new MockField({ fieldName: previousFieldName, dataType: 'number' })];
      const { hasChanges } = await vectorStyle.getDescriptorWithUpdatedStyleProps(
        nextFields,
        previousFields,
        mapColors
      );
      expect(hasChanges).toBe(false);
    });
  });

  describe('When styles should revert to static styling', () => {
    it('Should convert dynamic styles to static styles when there are no next fields', async () => {
      const vectorStyle = new VectorStyle({ properties }, new MockSource(), layer, customIcons);

      const nextFields = [];
      const { hasChanges, nextStyleDescriptor } =
        await vectorStyle.getDescriptorWithUpdatedStyleProps(nextFields, previousFields, mapColors);
      expect(hasChanges).toBe(true);
      expect(nextStyleDescriptor.properties[VECTOR_STYLES.LINE_COLOR]).toEqual({
        options: {
          color: '#41937c',
        },
        type: 'STATIC',
      });
      expect(nextStyleDescriptor.properties[VECTOR_STYLES.ICON_SIZE]).toEqual({
        options: {
          size: 6,
        },
        type: 'STATIC',
      });
    });

    it('Should convert dynamic ICON_SIZE static style when there are no next ordinal fields', async () => {
      const vectorStyle = new VectorStyle({ properties }, new MockSource(), layer, customIcons);

      const nextFields = [
        {
          getDataType: async () => {
            return 'number';
          },
          getLabel: async () => {
            return previousFieldName + '_label';
          },
          getName: () => {
            return previousFieldName;
          },
          getOrigin: () => {
            return FIELD_ORIGIN.SOURCE;
          },
          // ordinal field must support auto domain
          supportsFieldMetaFromLocalData: () => {
            return false;
          },
          supportsFieldMetaFromEs: () => {
            return false;
          },
        },
      ];
      const { hasChanges, nextStyleDescriptor } =
        await vectorStyle.getDescriptorWithUpdatedStyleProps(nextFields, previousFields, mapColors);
      expect(hasChanges).toBe(true);
      expect(nextStyleDescriptor.properties[VECTOR_STYLES.ICON_SIZE]).toEqual({
        options: {
          size: 6,
        },
        type: 'STATIC',
      });
    });
  });

  describe('When styles should not be cleared', () => {
    it('Should update field in styles when the fields and style combination remains compatible', async () => {
      const vectorStyle = new VectorStyle({ properties }, new MockSource(), layer, customIcons);

      const nextFields = [new MockField({ fieldName: 'someOtherField', dataType: 'number' })];
      const { hasChanges, nextStyleDescriptor } =
        await vectorStyle.getDescriptorWithUpdatedStyleProps(nextFields, previousFields, mapColors);
      expect(hasChanges).toBe(true);
      expect(nextStyleDescriptor.properties[VECTOR_STYLES.LINE_COLOR]).toEqual({
        options: {
          field: {
            name: 'someOtherField',
            origin: FIELD_ORIGIN.SOURCE,
          },
        },
        type: 'DYNAMIC',
      });
      expect(nextStyleDescriptor.properties[VECTOR_STYLES.ICON_SIZE]).toEqual({
        options: {
          minSize: 1,
          maxSize: 10,
          field: {
            name: 'someOtherField',
            origin: FIELD_ORIGIN.SOURCE,
          },
        },
        type: 'DYNAMIC',
      });
    });
  });
});

describe('pluckStyleMetaFromSourceDataRequest', () => {
  const layer = {};
  const customIcons = [];
  describe('has features', () => {
    it('Should identify when feature collection only contains points', async () => {
      const sourceDataRequest = new DataRequest({
        data: {
          type: 'FeatureCollection',
          features: [
            {
              geometry: {
                type: 'Point',
              },
              properties: {},
            },
            {
              geometry: {
                type: 'MultiPoint',
              },
              properties: {},
            },
          ],
        },
      });
      const vectorStyle = new VectorStyle({}, new MockSource(), layer, customIcons);

      const featuresMeta = await vectorStyle.pluckStyleMetaFromSourceDataRequest(sourceDataRequest);
      expect(featuresMeta.geometryTypes.isPointsOnly).toBe(true);
      expect(featuresMeta.geometryTypes.isLinesOnly).toBe(false);
      expect(featuresMeta.geometryTypes.isPolygonsOnly).toBe(false);
    });

    it('Should identify when feature collection only contains lines', async () => {
      const sourceDataRequest = new DataRequest({
        data: {
          type: 'FeatureCollection',
          features: [
            {
              geometry: {
                type: 'LineString',
              },
              properties: {},
            },
            {
              geometry: {
                type: 'MultiLineString',
              },
              properties: {},
            },
            {
              geometry: {
                type: 'Point',
              },
              properties: {
                __kbn_is_centroid_feature__: true,
              },
            },
          ],
        },
      });
      const vectorStyle = new VectorStyle({}, new MockSource(), layer, customIcons);

      const featuresMeta = await vectorStyle.pluckStyleMetaFromSourceDataRequest(sourceDataRequest);
      expect(featuresMeta.geometryTypes.isPointsOnly).toBe(false);
      expect(featuresMeta.geometryTypes.isLinesOnly).toBe(true);
      expect(featuresMeta.geometryTypes.isPolygonsOnly).toBe(false);
    });
  });

  describe('scaled field range', () => {
    const sourceDataRequest = new DataRequest({
      data: {
        type: 'FeatureCollection',
        features: [
          {
            geometry: {
              type: 'Point',
            },
            properties: {
              myDynamicField: 1,
            },
          },
          {
            geometry: {
              type: 'Point',
            },
            properties: {
              myDynamicField: 10,
            },
          },
        ],
      },
    });

    it('Should not extract scaled field range when scaled field has no values', async () => {
      const vectorStyle = new VectorStyle(
        {
          properties: {
            fillColor: {
              type: STYLE_TYPE.DYNAMIC,
              options: {
                field: {
                  origin: FIELD_ORIGIN.SOURCE,
                  name: 'myDynamicFieldWithNoValues',
                },
              },
            },
          },
        },
        new MockSource(),
        layer,
        customIcons
      );

      const featuresMeta = await vectorStyle.pluckStyleMetaFromSourceDataRequest(sourceDataRequest);
      expect(featuresMeta.geometryTypes.isPointsOnly).toBe(true);
      expect(featuresMeta.geometryTypes.isLinesOnly).toBe(false);
      expect(featuresMeta.geometryTypes.isPolygonsOnly).toBe(false);
    });

    it('Should extract scaled field range', async () => {
      const vectorStyle = new VectorStyle(
        {
          properties: {
            fillColor: {
              type: STYLE_TYPE.DYNAMIC,
              options: {
                field: {
                  origin: FIELD_ORIGIN.SOURCE,
                  name: 'myDynamicField',
                },
              },
            },
          },
        },
        new MockSource(),
        layer,
        customIcons
      );

      const styleMeta = await vectorStyle.pluckStyleMetaFromSourceDataRequest(sourceDataRequest);
      expect(styleMeta.fieldMeta.myDynamicField.range).toEqual({
        delta: 9,
        max: 10,
        min: 1,
      });
    });
  });
});
