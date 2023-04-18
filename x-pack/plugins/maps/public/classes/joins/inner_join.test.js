/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createJoinTermSource, InnerJoin } from './inner_join';
import { SOURCE_TYPES } from '../../../common/constants';

jest.mock('../../kibana_services', () => {});
jest.mock('../layers/vector_layer', () => {});

const rightSource = {
  type: SOURCE_TYPES.ES_TERM_SOURCE,
  id: 'd3625663-5b34-4d50-a784-0d743f676a0c',
  indexPatternId: '90943e30-9a47-11e8-b64d-95841ca0b247',
  term: 'geo.dest',
  metrics: [{ type: 'count' }],
};

const mockSource = {
  createField({ fieldName: name }) {
    return {
      getName() {
        return name;
      },
    };
  },
};

const leftJoin = new InnerJoin(
  {
    leftField: 'iso2',
    right: rightSource,
  },
  mockSource
);
const COUNT_PROPERTY_NAME = '__kbnjoin__count__d3625663-5b34-4d50-a784-0d743f676a0c';

describe('createJoinTermSource', () => {
  test('Should return undefined when descriptor is not provided', () => {
    expect(createJoinTermSource(undefined)).toBe(undefined);
  });

  test('Should return undefined with unmatched source type', () => {
    expect(
      createJoinTermSource({
        type: SOURCE_TYPES.WMS,
      })
    ).toBe(undefined);
  });

  describe('EsTermSource', () => {
    test('Should return EsTermSource', () => {
      expect(createJoinTermSource(rightSource).constructor.name).toBe('ESTermSource');
    });

    test('Should return undefined when indexPatternId is undefined', () => {
      expect(
        createJoinTermSource({
          ...rightSource,
          indexPatternId: undefined,
        })
      ).toBe(undefined);
    });

    test('Should return undefined when term is undefined', () => {
      expect(
        createJoinTermSource({
          ...rightSource,
          term: undefined,
        })
      ).toBe(undefined);
    });
  });

  describe('TableSource', () => {
    test('Should return TableSource', () => {
      expect(
        createJoinTermSource({
          type: SOURCE_TYPES.TABLE_SOURCE,
        }).constructor.name
      ).toBe('TableSource');
    });
  });
});

describe('joinPropertiesToFeature', () => {
  test('Should add join property to features in feature collection', () => {
    const feature = {
      properties: {
        iso2: 'CN',
      },
    };
    const propertiesMap = new Map();
    propertiesMap.set('CN', { [COUNT_PROPERTY_NAME]: 61 });

    leftJoin.joinPropertiesToFeature(feature, propertiesMap, [
      {
        propertyKey: COUNT_PROPERTY_NAME,
      },
    ]);
    expect(feature.properties).toEqual({
      iso2: 'CN',
      [COUNT_PROPERTY_NAME]: 61,
    });
  });

  test('Should delete previous join property values from feature', () => {
    const feature = {
      properties: {
        iso2: 'CN',
        [COUNT_PROPERTY_NAME]: 61,
        [`__kbn__dynamic__${COUNT_PROPERTY_NAME}__fillColor`]: 1,
      },
    };
    const propertiesMap = new Map();

    leftJoin.joinPropertiesToFeature(feature, propertiesMap, [
      {
        propertyKey: COUNT_PROPERTY_NAME,
      },
    ]);
    expect(feature.properties).toEqual({
      iso2: 'CN',
    });
  });

  test('Should coerce to string before joining', () => {
    const leftJoin = new InnerJoin(
      {
        leftField: 'zipcode',
        right: rightSource,
      },
      mockSource
    );

    const feature = {
      properties: {
        zipcode: 40204,
      },
    };
    const propertiesMap = new Map();
    propertiesMap.set('40204', { [COUNT_PROPERTY_NAME]: 61 });

    leftJoin.joinPropertiesToFeature(feature, propertiesMap, [
      {
        propertyKey: COUNT_PROPERTY_NAME,
      },
    ]);
    expect(feature.properties).toEqual({
      zipcode: 40204,
      [COUNT_PROPERTY_NAME]: 61,
    });
  });

  test('Should handle undefined values', () => {
    const feature = {
      //this feature does not have the iso2 field
      properties: {
        zipcode: 40204,
      },
    };
    const propertiesMap = new Map();
    propertiesMap.set('40204', { [COUNT_PROPERTY_NAME]: 61 });

    leftJoin.joinPropertiesToFeature(feature, propertiesMap, [
      {
        propertyKey: COUNT_PROPERTY_NAME,
      },
    ]);
    expect(feature.properties).toEqual({
      zipcode: 40204,
    });
  });

  test('Should handle falsy values', () => {
    const leftJoin = new InnerJoin(
      {
        leftField: 'code',
        right: rightSource,
      },
      mockSource
    );

    const feature = {
      properties: {
        code: 0,
      },
    };
    const propertiesMap = new Map();
    propertiesMap.set('0', { [COUNT_PROPERTY_NAME]: 61 });

    leftJoin.joinPropertiesToFeature(feature, propertiesMap, [
      {
        propertyKey: COUNT_PROPERTY_NAME,
      },
    ]);
    expect(feature.properties).toEqual({
      code: 0,
      [COUNT_PROPERTY_NAME]: 61,
    });
  });
});
