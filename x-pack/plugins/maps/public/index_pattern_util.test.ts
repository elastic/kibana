/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./kibana_services', () => ({}));

import {
  getSourceFields,
  getAggregatableGeoFieldTypes,
  supportsGeoTileAgg,
} from './index_pattern_util';
import { ES_GEO_FIELD_TYPE } from '../common/constants';

describe('getSourceFields', () => {
  test('Should remove multi fields from field list', () => {
    const fields = [
      {
        name: 'agent',
        type: 'string',
      },
      {
        name: 'agent.keyword',
        subType: {
          multi: {
            parent: 'agent',
          },
        },
        type: 'string',
      },
    ];
    const sourceFields = getSourceFields(fields);
    expect(sourceFields).toEqual([{ name: 'agent', type: 'string' }]);
  });
});

describe('Gold+ licensing', () => {
  const testStubs = [
    {
      field: {
        name: 'location',
        type: 'geo_point',
        aggregatable: true,
      },
      supportedInBasic: true,
      supportedInGold: true,
    },
    {
      field: {
        name: 'location',
        type: 'geo_shape',
        aggregatable: false,
      },
      supportedInBasic: false,
      supportedInGold: false,
    },
    {
      field: {
        name: 'location',
        type: 'geo_shape',
        aggregatable: true,
      },
      supportedInBasic: false,
      supportedInGold: true,
    },
  ];

  describe('basic license', () => {
    beforeEach(() => {
      require('./kibana_services').getIsGoldPlus = () => false;
    });

    describe('getAggregatableGeoFieldTypes', () => {
      test('Should only include geo_point fields ', () => {
        const aggregatableGeoFieldTypes = getAggregatableGeoFieldTypes();
        expect(aggregatableGeoFieldTypes).toEqual([ES_GEO_FIELD_TYPE.GEO_POINT]);
      });
    });

    describe('supportsGeoTileAgg', () => {
      testStubs.forEach((stub, index) => {
        test(`stub: ${index}`, () => {
          const supported = supportsGeoTileAgg(stub.field);
          expect(supported).toEqual(stub.supportedInBasic);
        });
      });
    });
  });

  describe('gold license', () => {
    beforeEach(() => {
      require('./kibana_services').getIsGoldPlus = () => true;
    });
    describe('getAggregatableGeoFieldTypes', () => {
      test('Should add geo_shape field', () => {
        const aggregatableGeoFieldTypes = getAggregatableGeoFieldTypes();
        expect(aggregatableGeoFieldTypes).toEqual([
          ES_GEO_FIELD_TYPE.GEO_POINT,
          ES_GEO_FIELD_TYPE.GEO_SHAPE,
        ]);
      });
    });
    describe('supportsGeoTileAgg', () => {
      testStubs.forEach((stub, index) => {
        test(`stub: ${index}`, () => {
          const supported = supportsGeoTileAgg(stub.field);
          expect(supported).toEqual(stub.supportedInGold);
        });
      });
    });
  });
});
