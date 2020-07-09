/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsDataTypeUnion } from '../../../common/schemas';

import {
  DEFAULT_DATE_REGEX,
  DEFAULT_GEO_REGEX,
  DEFAULT_LTE_GTE_REGEX,
  DEFAULT_SINGLE_REGEX,
  serializeGeoPoint,
  serializeGeoShape,
  serializeIpRange,
  serializeRanges,
  serializeSingleValue,
  transformListItemToElasticQuery,
} from './transform_list_item_to_elastic_query';

describe('transform_elastic_to_elastic_query', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('transformListItemToElasticQuery', () => {
    test('it transforms a shape to a union when it is a WKT', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'shape',
        value: 'POINT (-77.03653 38.897676)',
      });
      const expected: EsDataTypeUnion = { shape: 'POINT (-77.03653 38.897676)' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a shape to a union when it is a lat,lon', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'shape',
        value: '38.897676,-77.03653',
      });
      const expected: EsDataTypeUnion = { shape: 'POINT (-77.03653 38.897676)' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a geo_shape to a union when it is a WKT', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'geo_shape',
        value: 'POINT (-77.03653 38.897676)',
      });
      const expected: EsDataTypeUnion = { geo_shape: 'POINT (-77.03653 38.897676)' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a geo_shape to a union when it is a lat,lon', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'geo_shape',
        value: '38.897676,-77.03653',
      });
      const expected: EsDataTypeUnion = { geo_shape: 'POINT (-77.03653 38.897676)' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a geo_point to a union when it is a WKT', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'geo_point',
        value: 'POINT (-77.03653 38.897676)',
      });
      const expected: EsDataTypeUnion = { geo_point: 'POINT (-77.03653 38.897676)' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a geo_point to a union when it is a lat,lon', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'geo_point',
        value: '38.897676, -77.03653',
      });
      const expected: EsDataTypeUnion = { geo_point: { lat: '38.897676', lon: '-77.03653' } };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a ip_range to a union', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'ip_range',
        value: '127.0.0.1-127.0.0.2',
      });
      const expected: EsDataTypeUnion = {
        ip_range: { gte: '127.0.0.1', lte: '127.0.0.2' },
      };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a ip CIDR to a union', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'ip_range',
        value: '127.0.0.1/16',
      });
      const expected: EsDataTypeUnion = {
        ip_range: '127.0.0.1/16',
      };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a ip_range to a union even if only a single value is found', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'ip_range',
        value: '127.0.0.1',
      });
      const expected: EsDataTypeUnion = {
        ip_range: { gte: '127.0.0.1', lte: '127.0.0.1' },
      };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a ip_range to a union using a custom serializer', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: '(?<gte>.+),(?<lte>.+)|(?<value>.+)',
        type: 'ip_range',
        value: '127.0.0.1,127.0.0.2',
      });
      const expected: EsDataTypeUnion = {
        ip_range: { gte: '127.0.0.1', lte: '127.0.0.2' },
      };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a date_range to a union', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'date_range',
        value: '2020-06-02T06:19:51.434Z,2020-07-02T06:19:51.434Z',
      });
      const expected: EsDataTypeUnion = {
        date_range: { gte: '2020-06-02T06:19:51.434Z', lte: '2020-07-02T06:19:51.434Z' },
      };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a date_range to a union even if only one date is found', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'date_range',
        value: '2020-06-02T06:19:51.434Z',
      });
      const expected: EsDataTypeUnion = {
        date_range: { gte: '2020-06-02T06:19:51.434Z', lte: '2020-06-02T06:19:51.434Z' },
      };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a double_range to a union', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'double_range',
        value: '1.1-1.2',
      });
      const expected: EsDataTypeUnion = {
        double_range: { gte: '1.1', lte: '1.2' },
      };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a float_range to a union', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'float_range',
        value: '1.1-1.2',
      });
      const expected: EsDataTypeUnion = {
        float_range: { gte: '1.1', lte: '1.2' },
      };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a integer_range to a union', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'integer_range',
        value: '1.1-1.2',
      });
      const expected: EsDataTypeUnion = {
        integer_range: { gte: '1.1', lte: '1.2' },
      };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a integer_range to a union even if only one is found', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'integer_range',
        value: '1.1',
      });
      const expected: EsDataTypeUnion = {
        integer_range: { gte: '1.1', lte: '1.1' },
      };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a long_range to a union', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'long_range',
        value: '1.1-1.2',
      });
      const expected: EsDataTypeUnion = {
        long_range: { gte: '1.1', lte: '1.2' },
      };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a ip type and value to a union', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'ip',
        value: '127.0.0.1',
      });
      const expected: EsDataTypeUnion = { ip: '127.0.0.1' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a keyword type and value to a union', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'keyword',
        value: 'host-name',
      });
      const expected: EsDataTypeUnion = { keyword: 'host-name' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a text type and value to a union', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'text',
        value: 'host-name',
      });
      const expected: EsDataTypeUnion = { text: 'host-name' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a binary type and value to a union', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'binary',
        value: 'U29tZSBiaW5hcnkgYmxvYg==',
      });
      const expected: EsDataTypeUnion = { binary: 'U29tZSBiaW5hcnkgYmxvYg==' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a boolean type and value to a union', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'boolean',
        value: 'true',
      });
      const expected: EsDataTypeUnion = { boolean: 'true' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a byte type and value to a union', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'byte',
        value: '1',
      });
      const expected: EsDataTypeUnion = { byte: '1' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a date type and value to a union', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'date',
        value: '2020-07-02T06:19:51.434Z',
      });
      const expected: EsDataTypeUnion = { date: '2020-07-02T06:19:51.434Z' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a date_nanos type and value to a union', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'date_nanos',
        value: '2015-01-01T12:10:30.123456789Z',
      });
      const expected: EsDataTypeUnion = { date_nanos: '2015-01-01T12:10:30.123456789Z' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a double type and value to a union', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'double',
        value: '1.1',
      });
      const expected: EsDataTypeUnion = { double: '1.1' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a float type and value to a union', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'float',
        value: '1.1',
      });
      const expected: EsDataTypeUnion = { float: '1.1' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a integer type and value to a union', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'integer',
        value: '1',
      });
      const expected: EsDataTypeUnion = { integer: '1' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a long type and value to a union', () => {
      const elasticQuery = transformListItemToElasticQuery({
        serializer: undefined,
        type: 'long',
        value: '1',
      });
      const expected: EsDataTypeUnion = { long: '1' };
      expect(elasticQuery).toEqual(expected);
    });
  });

  describe('serializeGeoShape', () => {
    test('it transforms a shape to a union when it is a WKT', () => {
      const elasticQuery = serializeGeoShape({
        defaultSerializer: DEFAULT_GEO_REGEX,
        serializer: undefined,
        type: 'shape',
        value: 'POINT (-77.03653 38.897676)',
      });
      const expected: EsDataTypeUnion = { shape: 'POINT (-77.03653 38.897676)' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it trims extra spaces', () => {
      const elasticQuery = serializeGeoShape({
        defaultSerializer: DEFAULT_GEO_REGEX,
        serializer: undefined,
        type: 'shape',
        value: '    POINT (-77.03653 38.897676)   ',
      });
      const expected: EsDataTypeUnion = { shape: 'POINT (-77.03653 38.897676)' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a shape to a union when it is a lat,lon', () => {
      const elasticQuery = serializeGeoShape({
        defaultSerializer: DEFAULT_GEO_REGEX,
        serializer: undefined,
        type: 'shape',
        value: '38.897676,-77.03653',
      });
      const expected: EsDataTypeUnion = { shape: 'POINT (-77.03653 38.897676)' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a shape to a union when it is a lat,lon with a custom serializer', () => {
      const elasticQuery = serializeGeoShape({
        defaultSerializer: DEFAULT_GEO_REGEX,
        serializer: '(?<lat>.+)/(?<lon>.+)',
        type: 'shape',
        value: '38.897676/-77.03653',
      });
      const expected: EsDataTypeUnion = { shape: 'POINT (-77.03653 38.897676)' };
      expect(elasticQuery).toEqual(expected);
    });
  });

  describe('serializeGeoPoint', () => {
    test('it transforms a geo_point to a union when it is a WKT', () => {
      const elasticQuery = serializeGeoPoint({
        defaultSerializer: DEFAULT_GEO_REGEX,
        serializer: undefined,
        value: 'POINT (-77.03653 38.897676)',
      });
      const expected: EsDataTypeUnion = { geo_point: 'POINT (-77.03653 38.897676)' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it trims extra spaces', () => {
      const elasticQuery = serializeGeoPoint({
        defaultSerializer: DEFAULT_GEO_REGEX,
        serializer: undefined,
        value: '      POINT (-77.03653 38.897676) ',
      });
      const expected: EsDataTypeUnion = { geo_point: 'POINT (-77.03653 38.897676)' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a geo_point to a union when it is a lat,lon', () => {
      const elasticQuery = serializeGeoPoint({
        defaultSerializer: DEFAULT_GEO_REGEX,
        serializer: undefined,
        value: '38.897676, -77.03653',
      });
      const expected: EsDataTypeUnion = { geo_point: { lat: '38.897676', lon: '-77.03653' } };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a geo_point to a union when it is a lat,lon with a custom serializer', () => {
      const elasticQuery = serializeGeoPoint({
        defaultSerializer: DEFAULT_GEO_REGEX,
        serializer: '(?<lat>.+)/(?<lon>.+)',
        value: '38.897676/-77.03653',
      });
      const expected: EsDataTypeUnion = { geo_point: { lat: '38.897676', lon: '-77.03653' } };
      expect(elasticQuery).toEqual(expected);
    });
  });

  describe('serializeIpRange', () => {
    test('it transforms a ip_range to a union', () => {
      const elasticQuery = serializeIpRange({
        defaultSerializer: DEFAULT_LTE_GTE_REGEX,
        serializer: undefined,
        value: '127.0.0.1-127.0.0.2',
      });
      const expected: EsDataTypeUnion = {
        ip_range: { gte: '127.0.0.1', lte: '127.0.0.2' },
      };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a ip CIDR to a union', () => {
      const elasticQuery = serializeIpRange({
        defaultSerializer: DEFAULT_LTE_GTE_REGEX,
        serializer: undefined,
        value: '127.0.0.1/16',
      });
      const expected: EsDataTypeUnion = {
        ip_range: '127.0.0.1/16',
      };
      expect(elasticQuery).toEqual(expected);
    });

    test('it trims extras spaces', () => {
      const elasticQuery = serializeIpRange({
        defaultSerializer: DEFAULT_LTE_GTE_REGEX,
        serializer: undefined,
        value: '       127.0.0.1    -    127.0.0.2     ',
      });
      const expected: EsDataTypeUnion = {
        ip_range: { gte: '127.0.0.1', lte: '127.0.0.2' },
      };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a ip_range to a union even if only a single value is found', () => {
      const elasticQuery = serializeIpRange({
        defaultSerializer: DEFAULT_LTE_GTE_REGEX,
        serializer: undefined,
        value: '127.0.0.1',
      });
      const expected: EsDataTypeUnion = {
        ip_range: { gte: '127.0.0.1', lte: '127.0.0.1' },
      };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a ip_range to a union using a custom serializer', () => {
      const elasticQuery = serializeIpRange({
        defaultSerializer: DEFAULT_LTE_GTE_REGEX,
        serializer: '(?<gte>.+),(?<lte>.+)|(?<value>.+)',
        value: '127.0.0.1,127.0.0.2',
      });
      const expected: EsDataTypeUnion = {
        ip_range: { gte: '127.0.0.1', lte: '127.0.0.2' },
      };
      expect(elasticQuery).toEqual(expected);
    });
  });

  describe('serializeRanges', () => {
    test('it transforms a date_range to a union', () => {
      const elasticQuery = serializeRanges({
        defaultSerializer: DEFAULT_DATE_REGEX,
        serializer: undefined,
        type: 'date_range',
        value: '2020-06-02T06:19:51.434Z,2020-07-02T06:19:51.434Z',
      });
      const expected: EsDataTypeUnion = {
        date_range: { gte: '2020-06-02T06:19:51.434Z', lte: '2020-07-02T06:19:51.434Z' },
      };
      expect(elasticQuery).toEqual(expected);
    });

    test('it trims extra spaces', () => {
      const elasticQuery = serializeRanges({
        defaultSerializer: DEFAULT_DATE_REGEX,
        serializer: undefined,
        type: 'date_range',
        value: '   2020-06-02T06:19:51.434Z   ,  2020-07-02T06:19:51.434Z  ',
      });
      const expected: EsDataTypeUnion = {
        date_range: { gte: '2020-06-02T06:19:51.434Z', lte: '2020-07-02T06:19:51.434Z' },
      };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a date_range to a union even if only one date is found', () => {
      const elasticQuery = serializeRanges({
        defaultSerializer: DEFAULT_DATE_REGEX,
        serializer: undefined,
        type: 'date_range',
        value: '2020-06-02T06:19:51.434Z',
      });
      const expected: EsDataTypeUnion = {
        date_range: { gte: '2020-06-02T06:19:51.434Z', lte: '2020-06-02T06:19:51.434Z' },
      };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a long_range to a union with a custom serializer', () => {
      const elasticQuery = serializeRanges({
        defaultSerializer: DEFAULT_DATE_REGEX,
        serializer: '(?<gte>.+)/(?<lte>.+)|(?<value>.+)',
        type: 'long_range',
        value: '1/2',
      });
      const expected: EsDataTypeUnion = {
        long_range: { gte: '1', lte: '2' },
      };
      expect(elasticQuery).toEqual(expected);
    });
  });

  describe('serializeSingleValue', () => {
    test('it transforms a ip type and value to a union', () => {
      const elasticQuery = serializeSingleValue({
        defaultSerializer: DEFAULT_SINGLE_REGEX,
        serializer: undefined,
        type: 'ip',
        value: '127.0.0.1',
      });
      const expected: EsDataTypeUnion = { ip: '127.0.0.1' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it trims extra spaces', () => {
      const elasticQuery = serializeSingleValue({
        defaultSerializer: DEFAULT_SINGLE_REGEX,
        serializer: undefined,
        type: 'ip',
        value: '    127.0.0.1   ',
      });
      const expected: EsDataTypeUnion = { ip: '127.0.0.1' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it transforms a ip type and value to a union with a custom serializer', () => {
      const elasticQuery = serializeSingleValue({
        defaultSerializer: DEFAULT_SINGLE_REGEX,
        serializer: 'junk-(?<value>.+)',
        type: 'ip',
        value: 'junk-127.0.0.1',
      });
      const expected: EsDataTypeUnion = { ip: '127.0.0.1' };
      expect(elasticQuery).toEqual(expected);
    });

    test('it returns the value as is if it does not match the custom serializer', () => {
      const elasticQuery = serializeSingleValue({
        defaultSerializer: DEFAULT_SINGLE_REGEX,
        serializer: 'junk-(?<value>garbage)',
        type: 'ip',
        value: 'junk-127.0.0.1',
      });
      const expected: EsDataTypeUnion = { ip: 'junk-127.0.0.1' };
      expect(elasticQuery).toEqual(expected);
    });
  });
});
