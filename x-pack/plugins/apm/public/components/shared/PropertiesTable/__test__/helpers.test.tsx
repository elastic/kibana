/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../propertyConfig', () => {
  return {
    PROPERTY_CONFIG: [
      {
        key: 'testProperty',
        label: 'testPropertyLabel',
        required: false,
        presortedKeys: ['name', 'age']
      },
      {
        key: 'optionalProperty',
        label: 'optionalPropertyLabel',
        required: false
      },
      {
        key: 'requiredProperty',
        label: 'requiredPropertyLabel',
        required: true
      }
    ]
  };
});

import * as propertyConfig from '../helpers';
const { getPropertiesFromObject, sortKeysByConfig } = propertyConfig;

describe('propertyConfig', () => {
  describe('getPropertiesFromObject', () => {
    it('should return selected and required keys only', () => {
      const expectedTabs = [
        {
          key: 'testProperty',
          label: 'testPropertyLabel'
        },
        {
          key: 'requiredProperty',
          label: 'requiredPropertyLabel'
        }
      ];
      expect(getPropertiesFromObject({ testProperty: {} } as any)).toEqual(
        expectedTabs
      );
    });
  });

  describe('sortKeysByConfig', () => {
    const testData = {
      color: 'blue',
      name: 'Jess',
      age: '39',
      numbers: [1, 2, 3],
      _id: '44x099z'
    };

    it('should sort with presorted keys first', () => {
      expect(sortKeysByConfig(testData, 'testProperty')).toEqual([
        'name',
        'age',
        '_id',
        'color',
        'numbers'
      ]);
    });

    it('should alpha-sort keys when there is no config value found', () => {
      expect(sortKeysByConfig(testData, 'nonExistentKey')).toEqual([
        '_id',
        'age',
        'color',
        'name',
        'numbers'
      ]);
    });
  });
});
