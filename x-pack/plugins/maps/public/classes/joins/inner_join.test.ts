/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature } from 'geojson';
import type {
  ESTermSourceDescriptor,
  JoinSourceDescriptor,
} from '../../../common/descriptor_types';
import type { IVectorSource } from '../sources/vector_source';
import type { IField } from '../fields/field';
import { createJoinSource, InnerJoin } from './inner_join';
import { AGG_TYPE, SOURCE_TYPES } from '../../../common/constants';

jest.mock('../../kibana_services', () => {});
jest.mock('../layers/vector_layer', () => {});

const rightSource = {
  type: SOURCE_TYPES.ES_TERM_SOURCE,
  id: 'd3625663-5b34-4d50-a784-0d743f676a0c',
  indexPatternId: '90943e30-9a47-11e8-b64d-95841ca0b247',
  term: 'geo.dest',
  metrics: [{ type: AGG_TYPE.COUNT }],
} as ESTermSourceDescriptor;

const mockSource = {
  getFieldByName(fieldName: string) {
    return {
      getName() {
        return fieldName;
      },
    } as unknown as IField;
  },
} as unknown as IVectorSource;

const iso2LeftJoin = new InnerJoin(
  {
    leftField: 'iso2',
    right: rightSource,
  },
  mockSource
);
const COUNT_PROPERTY_NAME = '__kbnjoin__count__d3625663-5b34-4d50-a784-0d743f676a0c';

describe('createJoinSource', () => {
  test('Should return undefined when descriptor is not provided', () => {
    expect(createJoinSource(undefined)).toBe(undefined);
  });

  test('Should return undefined with unmatched source type', () => {
    expect(
      createJoinSource({
        type: SOURCE_TYPES.WMS,
      } as unknown as Partial<JoinSourceDescriptor>)
    ).toBe(undefined);
  });

  describe('EsTermSource', () => {
    test('Should return EsTermSource', () => {
      expect(createJoinSource(rightSource)?.constructor.name).toBe('ESTermSource');
    });

    test('Should return undefined when indexPatternId is undefined', () => {
      expect(
        createJoinSource({
          ...rightSource,
          indexPatternId: undefined,
        })
      ).toBe(undefined);
    });

    test('Should return undefined when term is undefined', () => {
      expect(
        createJoinSource({
          ...rightSource,
          term: undefined,
        })
      ).toBe(undefined);
    });
  });

  describe('TableSource', () => {
    test('Should return TableSource', () => {
      expect(
        createJoinSource({
          type: SOURCE_TYPES.TABLE_SOURCE,
        })?.constructor.name
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
    } as unknown as Feature;
    const propertiesMap = new Map();
    propertiesMap.set('CN', { [COUNT_PROPERTY_NAME]: 61 });

    iso2LeftJoin.joinPropertiesToFeature(feature, propertiesMap);
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
    } as unknown as Feature;
    const propertiesMap = new Map();

    iso2LeftJoin.joinPropertiesToFeature(feature, propertiesMap);
    expect(feature.properties).toEqual({
      iso2: 'CN',
    });
  });

  test('Should coerce to string before joining', () => {
    const zipCodeLeftJoin = new InnerJoin(
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
    } as unknown as Feature;
    const propertiesMap = new Map();
    propertiesMap.set('40204', { [COUNT_PROPERTY_NAME]: 61 });

    zipCodeLeftJoin.joinPropertiesToFeature(feature, propertiesMap);
    expect(feature.properties).toEqual({
      zipcode: 40204,
      [COUNT_PROPERTY_NAME]: 61,
    });
  });

  test('Should handle undefined values', () => {
    const feature = {
      // this feature does not have the iso2 field
      properties: {
        zipcode: 40204,
      },
    } as unknown as Feature;
    const propertiesMap = new Map();
    propertiesMap.set('40204', { [COUNT_PROPERTY_NAME]: 61 });

    iso2LeftJoin.joinPropertiesToFeature(feature, propertiesMap);
    expect(feature.properties).toEqual({
      zipcode: 40204,
    });
  });

  test('Should handle falsy values', () => {
    const codeLeftJoin = new InnerJoin(
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
    } as unknown as Feature;
    const propertiesMap = new Map();
    propertiesMap.set('0', { [COUNT_PROPERTY_NAME]: 61 });

    codeLeftJoin.joinPropertiesToFeature(feature, propertiesMap);
    expect(feature.properties).toEqual({
      code: 0,
      [COUNT_PROPERTY_NAME]: 61,
    });
  });
});
