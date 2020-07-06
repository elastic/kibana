/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { VectorStyle } from './vector_style';
import { DataRequest } from '../../util/data_request';
import {
  FIELD_ORIGIN,
  STYLE_TYPE,
  VECTOR_SHAPE_TYPE,
  VECTOR_STYLES,
} from '../../../../common/constants';

jest.mock('../../../kibana_services');
jest.mock('ui/new_platform');

class MockField {
  constructor({ fieldName }) {
    this._fieldName = fieldName;
  }

  getName() {
    return this._fieldName;
  }

  isValid() {
    return !!this._fieldName;
  }
}

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

describe('getDescriptorWithMissingStylePropsRemoved', () => {
  const fieldName = 'doIStillExist';
  const mapColors = [];
  const properties = {
    fillColor: {
      type: STYLE_TYPE.STATIC,
      options: {},
    },
    lineColor: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        field: {
          name: fieldName,
          origin: FIELD_ORIGIN.SOURCE,
        },
      },
    },
    iconSize: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        minSize: 1,
        maxSize: 10,
        field: { name: fieldName, origin: FIELD_ORIGIN.SOURCE },
      },
    },
  };

  beforeEach(() => {
    require('../../../kibana_services').getUiSettings = () => ({
      get: jest.fn(),
    });
  });

  it('Should return no changes when next ordinal fields contain existing style property fields', () => {
    const vectorStyle = new VectorStyle({ properties }, new MockSource());

    const nextFields = [new MockField({ fieldName })];
    const { hasChanges } = vectorStyle.getDescriptorWithMissingStylePropsRemoved(
      nextFields,
      mapColors
    );
    expect(hasChanges).toBe(false);
  });

  it('Should clear missing fields when next ordinal fields do not contain existing style property fields', () => {
    const vectorStyle = new VectorStyle({ properties }, new MockSource());

    const nextFields = [new MockField({ fieldName: 'someOtherField' })];
    const {
      hasChanges,
      nextStyleDescriptor,
    } = vectorStyle.getDescriptorWithMissingStylePropsRemoved(nextFields, mapColors);
    expect(hasChanges).toBe(true);
    expect(nextStyleDescriptor.properties[VECTOR_STYLES.LINE_COLOR]).toEqual({
      options: {},
      type: 'DYNAMIC',
    });
    expect(nextStyleDescriptor.properties[VECTOR_STYLES.ICON_SIZE]).toEqual({
      options: {
        minSize: 1,
        maxSize: 10,
      },
      type: 'DYNAMIC',
    });
  });

  it('Should convert dynamic styles to static styles when there are no next fields', () => {
    const vectorStyle = new VectorStyle({ properties }, new MockSource());

    const nextFields = [];
    const {
      hasChanges,
      nextStyleDescriptor,
    } = vectorStyle.getDescriptorWithMissingStylePropsRemoved(nextFields, mapColors);
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
});

describe('pluckStyleMetaFromSourceDataRequest', () => {
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
      const vectorStyle = new VectorStyle({}, new MockSource());

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
          ],
        },
      });
      const vectorStyle = new VectorStyle({}, new MockSource());

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
        new MockSource()
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
        new MockSource()
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
