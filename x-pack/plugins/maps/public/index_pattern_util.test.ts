/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./kibana_services', () => ({}));
jest.mock('./licensed_features', () => ({}));

import {
  getSourceFields,
  getAggregatableGeoFieldTypes,
  supportsGeoTileAgg,
} from './index_pattern_util';
import { ES_GEO_FIELD_TYPE } from '../common/constants';
import { IndexPatternField } from '@kbn/data-plugin/public';

describe('getSourceFields', () => {
  test('Should remove multi fields from field list', () => {
    const agent = new IndexPatternField({
      name: 'agent',
      searchable: true,
      aggregatable: true,
      type: 'string',
    });

    const agentKeyword = new IndexPatternField({
      name: 'agent.keyword',
      subType: {
        multi: {
          parent: 'agent',
        },
      },
      searchable: true,
      aggregatable: true,
      type: 'string',
    });

    const fields = [agent, agentKeyword];
    const sourceFields = getSourceFields(fields);
    expect(sourceFields.length).toEqual(1);
    expect(sourceFields[0].name).toEqual('agent');
    expect(sourceFields[0].type).toEqual('string');
  });
});

describe('Gold+ licensing', () => {
  const testStubs = [
    {
      field: {
        name: 'location',
        type: 'geo_point',
        aggregatable: true,
      } as IndexPatternField,
      supportedInBasic: true,
      supportedInGold: true,
    },
    {
      field: {
        name: 'location',
        type: 'geo_shape',
        aggregatable: false,
      } as IndexPatternField,
      supportedInBasic: false,
      supportedInGold: false,
    },
    {
      field: {
        name: 'location',
        type: 'geo_shape',
        aggregatable: true,
      } as IndexPatternField,
      supportedInBasic: false,
      supportedInGold: true,
    },
  ];

  describe('basic license', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('./licensed_features').getIsGoldPlus = () => false;
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
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('./licensed_features').getIsGoldPlus = () => true;
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
