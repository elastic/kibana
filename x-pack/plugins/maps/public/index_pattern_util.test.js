/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./kibana_services', () => ({}));

import { getSourceFields, getAggregatableGeoFieldTypes } from './index_pattern_util';
import { ES_GEO_FIELD_TYPE } from '../common/constants';

describe('getSourceFields', () => {
  test('Should remove multi fields from field list', () => {
    const fields = [
      {
        name: 'agent',
      },
      {
        name: 'agent.keyword',
        subType: {
          multi: {
            parent: 'agent',
          },
        },
      },
    ];
    const sourceFields = getSourceFields(fields);
    expect(sourceFields).toEqual([{ name: 'agent' }]);
  });
});

describe('getAggregatableGeoFieldTypes', () => {
  describe('basic license', () => {
    beforeEach(() => {
      require('./kibana_services').getIsGoldPlus = () => false;
    });

    test('Should only include geo_point fields ', () => {
      const aggregatableGeoFieldTypes = getAggregatableGeoFieldTypes();
      expect(aggregatableGeoFieldTypes).toEqual([ES_GEO_FIELD_TYPE.GEO_POINT]);
    });
  });

  describe('gold license', () => {
    beforeEach(() => {
      require('./kibana_services').getIsGoldPlus = () => true;
    });
    test('Should include geo_shape fields', () => {
      const aggregatableGeoFieldTypes = getAggregatableGeoFieldTypes();
      expect(aggregatableGeoFieldTypes).toEqual([
        ES_GEO_FIELD_TYPE.GEO_POINT,
        ES_GEO_FIELD_TYPE.GEO_SHAPE,
      ]);
    });
  });
});
