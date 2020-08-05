/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchEsListItemSchema } from '../../../common/schemas';
import { getSearchEsListItemsAsAllUndefinedMock } from '../../../common/schemas/elastic_response/search_es_list_item_schema.mock';

import {
  DEFAULT_DATE_RANGE,
  DEFAULT_GEO_POINT,
  DEFAULT_LTE_GTE,
  DEFAULT_VALUE,
  deserializeValue,
  findSourceValue,
} from './find_source_value';

describe('find_source_value', () => {
  describe('findSourceValue', () => {
    test('it returns a binary type', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        binary: 'U29tZSBiaW5hcnkgYmxvYg==',
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('U29tZSBiaW5hcnkgYmxvYg==');
    });

    test('it returns a boolean type', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        boolean: 'true',
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('true');
    });

    test('it returns a byte type', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        byte: '1',
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('1');
    });

    test('it returns a date type', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        date: '2020-07-01T23:10:19.505Z',
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('2020-07-01T23:10:19.505Z');
    });

    test('it returns a date_nanos type', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        date_nanos: '2015-01-01T12:10:30.123456789Z',
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('2015-01-01T12:10:30.123456789Z');
    });

    test('it returns a date_range type', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        date_range: { gte: '2020-07-01T23:10:19.505Z', lte: '2020-07-01T23:10:19.505Z' },
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('2020-07-01T23:10:19.505Z,2020-07-01T23:10:19.505Z');
    });

    test('it returns a double type', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        double: '1.1',
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('1.1');
    });

    test('it returns a double_range type', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        double_range: { gte: '1.1', lte: '1.2' },
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('1.1-1.2');
    });

    test('it returns a float type', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        float: '1.1',
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('1.1');
    });

    test('it returns a float_range type', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        float_range: { gte: '1.1', lte: '2.1' },
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('1.1-2.1');
    });

    test('it returns a geo_point type', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        geo_point: 'POINT (-71.34 41.12)',
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('POINT (-71.34 41.12)');
    });

    test('it returns a geo_point type which has a lat lon', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        geo_point: { lat: '41', lon: '-71' },
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('41,-71');
    });

    test('it returns a geo_shape type', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        geo_shape: 'POINT (-71.34 41.12)',
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('POINT (-71.34 41.12)');
    });

    test('it returns a half_float type', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        half_float: '1.2',
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('1.2');
    });

    test('it returns a integer type', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        integer: '1',
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('1');
    });

    test('it returns a integer_range type', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        integer: '1-2',
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('1-2');
    });

    test('it returns a ip type', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        ip: '127.0.0.1',
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('127.0.0.1');
    });

    test('it returns a ip_range type', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        ip_range: '127.0.0.1-127.0.0.2',
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('127.0.0.1-127.0.0.2');
    });

    test('it returns a keyword type', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        keyword: 'www.example.com',
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('www.example.com');
    });

    test('it returns a long type', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        long: '1',
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('1');
    });

    test('it returns a long_range type', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        long_range: { gte: '1', lte: '2' },
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('1-2');
    });

    test('it returns a shape type', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        shape: 'POINT (-71.34 41.12)',
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('POINT (-71.34 41.12)');
    });

    test('it returns a short type', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        short: '1',
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('1');
    });

    test('it returns a text type', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        text: 'www.example.com',
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('www.example.com');
    });

    test('it returns null if the type is not found because the type was never specified', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual(null);
    });

    test('it will custom deserialize a single value with a custom deserializer', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        deserializer: 'custom value: {{value}}',
        text: 'www.example.com',
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('custom value: www.example.com');
    });

    test('it will custom deserialize a text with a custom deserializer', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        deserializer: 'custom value: {{value}}',
        text: 'www.example.com',
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('custom value: www.example.com');
    });

    test('it will custom deserialize a date_range with a custom deserializer', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        date_range: { gte: '2020-07-01T23:10:19.505Z', lte: '2020-07-01T23:10:19.505Z' },
        deserializer: 'custom value: {{gte}} {{lte}}',
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('custom value: 2020-07-01T23:10:19.505Z 2020-07-01T23:10:19.505Z');
    });

    test('it will custom deserialize a ip_range with a custom deserializer using lte, gte', () => {
      const listItem: SearchEsListItemSchema = {
        ...getSearchEsListItemsAsAllUndefinedMock(),
        deserializer: 'custom value: {{gte}} {{lte}}',
        ip_range: { gte: '127.0.0.1', lte: '127.0.0.2' },
      };
      const value = findSourceValue(listItem);
      expect(value).toEqual('custom value: 127.0.0.1 127.0.0.2');
    });
  });

  describe('deserializeValue', () => {
    test('it deserializes a regular value', () => {
      const deserialized = deserializeValue({
        defaultDeserializer: DEFAULT_VALUE,
        defaultValueDeserializer: DEFAULT_VALUE,
        deserializer: undefined,
        value: 'some value',
      });
      expect(deserialized).toEqual('some value');
    });

    test('it deserializes a value using the defaultValueDeserializer if its default is a gte, lte but we only provide a value', () => {
      const deserialized = deserializeValue({
        defaultDeserializer: DEFAULT_LTE_GTE,
        defaultValueDeserializer: DEFAULT_VALUE,
        deserializer: undefined,
        value: 'some value',
      });
      expect(deserialized).toEqual('some value');
    });

    test('it deserializes a lte, gte value if given one', () => {
      const deserialized = deserializeValue({
        defaultDeserializer: DEFAULT_LTE_GTE,
        defaultValueDeserializer: DEFAULT_VALUE,
        deserializer: undefined,
        value: { gte: '1', lte: '2' },
      });
      expect(deserialized).toEqual('1-2');
    });

    test('it deserializes a lte, gte value if given a custom deserializer', () => {
      const deserialized = deserializeValue({
        defaultDeserializer: DEFAULT_LTE_GTE,
        defaultValueDeserializer: DEFAULT_VALUE,
        deserializer: '{{{gte}}},{{{lte}}}',
        value: { gte: '1', lte: '2' },
      });
      expect(deserialized).toEqual('1,2');
    });

    test('it deserializes using the default if given a lte, get value but the deserializer does not include gte and lte', () => {
      const deserialized = deserializeValue({
        defaultDeserializer: DEFAULT_LTE_GTE,
        defaultValueDeserializer: DEFAULT_VALUE,
        deserializer: '{{{value}}}',
        value: { gte: '1', lte: '2' },
      });
      expect(deserialized).toEqual('1-2');
    });

    test('it deserializes a lat, lon value if given one', () => {
      const deserialized = deserializeValue({
        defaultDeserializer: DEFAULT_GEO_POINT,
        defaultValueDeserializer: DEFAULT_VALUE,
        deserializer: undefined,
        value: { lat: '1', lon: '2' },
      });
      expect(deserialized).toEqual('1,2');
    });

    test('it deserializes a lat, lon value if given a custom deserializer', () => {
      const deserialized = deserializeValue({
        defaultDeserializer: DEFAULT_GEO_POINT,
        defaultValueDeserializer: DEFAULT_VALUE,
        deserializer: '{{{lat}}}-{{{lon}}}',
        value: { lat: '1', lon: '2' },
      });
      expect(deserialized).toEqual('1-2');
    });

    test('it deserializes a lte, gte value with a comma if given a date range deserializer', () => {
      const deserialized = deserializeValue({
        defaultDeserializer: DEFAULT_DATE_RANGE,
        defaultValueDeserializer: DEFAULT_VALUE,
        deserializer: undefined,
        value: { gte: '1', lte: '2' },
      });
      expect(deserialized).toEqual('1,2');
    });
  });
});
