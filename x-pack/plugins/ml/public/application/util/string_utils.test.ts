/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  replaceStringTokens,
  detectorToString,
  sortByKey,
  toLocaleString,
  mlEscape,
  escapeForElasticsearchQuery,
} from './string_utils';

describe('ML - string utils', () => {
  describe('replaceStringTokens', () => {
    const testRecord = {
      job_id: 'test_job',
      result_type: 'record',
      probability: 0.0191711,
      record_score: 4.3,
      bucket_span: 300,
      detector_index: 0,
      timestamp: 1454890500000,
      function: 'mean',
      function_description: 'mean',
      field_name: 'responsetime',
      user: "Des O'Connor",
      testfield1: 'test$tring=[+-?]',
      testfield2: '{<()>}',
      testfield3: 'host=\\\\test@uk.dev',
    };

    test('returns correct values without URI encoding', () => {
      const result = replaceStringTokens('user=$user$,time=$timestamp$', testRecord, false);
      expect(result).toBe("user=Des O'Connor,time=1454890500000");
    });

    test('returns correct values for missing token without URI encoding', () => {
      const result = replaceStringTokens('user=$username$,time=$timestamp$', testRecord, false);
      expect(result).toBe('user=$username$,time=1454890500000');
    });

    test('returns correct values with URI encoding', () => {
      const testString1 = 'https://www.google.co.uk/webhp#q=$testfield1$';
      const testString2 = 'https://www.google.co.uk/webhp#q=$testfield2$';
      const testString3 = 'https://www.google.co.uk/webhp#q=$testfield3$';
      const testString4 = 'https://www.google.co.uk/webhp#q=$user$';

      const result1 = replaceStringTokens(testString1, testRecord, true);
      const result2 = replaceStringTokens(testString2, testRecord, true);
      const result3 = replaceStringTokens(testString3, testRecord, true);
      const result4 = replaceStringTokens(testString4, testRecord, true);

      expect(result1).toBe('https://www.google.co.uk/webhp#q=test%24tring%3D%5B%2B-%3F%5D');
      expect(result2).toBe('https://www.google.co.uk/webhp#q=%7B%3C()%3E%7D');
      expect(result3).toBe('https://www.google.co.uk/webhp#q=host%3D%5C%5Ctest%40uk.dev');
      expect(result4).toBe("https://www.google.co.uk/webhp#q=Des%20O'Connor");
    });

    test('returns correct values for missing token with URI encoding', () => {
      const testString = 'https://www.google.co.uk/webhp#q=$username$&time=$timestamp$';
      const result = replaceStringTokens(testString, testRecord, true);
      expect(result).toBe('https://www.google.co.uk/webhp#q=$username$&time=1454890500000');
    });
  });

  describe('detectorToString', () => {
    test('returns the correct descriptions for detectors', () => {
      const detector1 = {
        function: 'count',
      };

      const detector2 = {
        function: 'count',
        by_field_name: 'airline',
        use_null: false,
      };

      const detector3 = {
        function: 'mean',
        field_name: 'CPUUtilization',
        partition_field_name: 'region',
        by_field_name: 'host',
        over_field_name: 'user',
        exclude_frequent: 'all',
      };

      expect(detectorToString(detector1)).toBe('count');
      expect(detectorToString(detector2)).toBe('count by airline use_null=false');
      expect(detectorToString(detector3)).toBe(
        'mean(CPUUtilization) by host over user partition_field_name=region exclude_frequent=all'
      );
    });
  });

  describe('sortByKey', () => {
    const obj = {
      zebra: 'stripes',
      giraffe: 'neck',
      elephant: 'trunk',
    };

    const valueComparator = function(value: string) {
      return value;
    };

    test('returns correct ordering with default comparator', () => {
      const result = sortByKey(obj, false);
      const keys = Object.keys(result);
      expect(keys[0]).toBe('elephant');
      expect(keys[1]).toBe('giraffe');
      expect(keys[2]).toBe('zebra');
    });

    test('returns correct ordering with default comparator and order reversed', () => {
      const result = sortByKey(obj, true);
      const keys = Object.keys(result);
      expect(keys[0]).toBe('zebra');
      expect(keys[1]).toBe('giraffe');
      expect(keys[2]).toBe('elephant');
    });

    test('returns correct ordering with comparator', () => {
      const result = sortByKey(obj, false, valueComparator);
      const keys = Object.keys(result);
      expect(keys[0]).toBe('giraffe');
      expect(keys[1]).toBe('zebra');
      expect(keys[2]).toBe('elephant');
    });

    test('returns correct ordering with comparator and order reversed', () => {
      const result = sortByKey(obj, true, valueComparator);
      const keys = Object.keys(result);
      expect(keys[0]).toBe('elephant');
      expect(keys[1]).toBe('zebra');
      expect(keys[2]).toBe('giraffe');
    });
  });

  describe('toLocaleString', () => {
    test('returns correct comma placement for large numbers', () => {
      expect(toLocaleString(1)).toBe('1');
      expect(toLocaleString(10)).toBe('10');
      expect(toLocaleString(100)).toBe('100');
      expect(toLocaleString(1000)).toBe('1,000');
      expect(toLocaleString(10000)).toBe('10,000');
      expect(toLocaleString(100000)).toBe('100,000');
      expect(toLocaleString(1000000)).toBe('1,000,000');
      expect(toLocaleString(10000000)).toBe('10,000,000');
      expect(toLocaleString(100000000)).toBe('100,000,000');
      expect(toLocaleString(1000000000)).toBe('1,000,000,000');
    });
  });

  describe('mlEscape', () => {
    test('returns correct escaping of characters', () => {
      expect(mlEscape('foo&bar')).toBe('foo&amp;bar');
      expect(mlEscape('foo<bar')).toBe('foo&lt;bar');
      expect(mlEscape('foo>bar')).toBe('foo&gt;bar');
      expect(mlEscape('foo"bar')).toBe('foo&quot;bar');
      expect(mlEscape("foo'bar")).toBe('foo&#39;bar');
      expect(mlEscape('foo/bar')).toBe('foo&#x2F;bar');
    });
  });

  describe('escapeForElasticsearchQuery', () => {
    test('returns correct escaping of reserved elasticsearch characters', () => {
      expect(escapeForElasticsearchQuery('foo+bar')).toBe('foo\\+bar');
      expect(escapeForElasticsearchQuery('foo-bar')).toBe('foo\\-bar');
      expect(escapeForElasticsearchQuery('foo=bar')).toBe('foo\\=bar');
      expect(escapeForElasticsearchQuery('foo&&bar')).toBe('foo\\&\\&bar');
      expect(escapeForElasticsearchQuery('foo||bar')).toBe('foo\\|\\|bar');
      expect(escapeForElasticsearchQuery('foo>bar')).toBe('foo\\>bar');
      expect(escapeForElasticsearchQuery('foo<bar')).toBe('foo\\<bar');
      expect(escapeForElasticsearchQuery('foo!bar')).toBe('foo\\!bar');
      expect(escapeForElasticsearchQuery('foo(bar')).toBe('foo\\(bar');
      expect(escapeForElasticsearchQuery('foo)bar')).toBe('foo\\)bar');
      expect(escapeForElasticsearchQuery('foo{bar')).toBe('foo\\{bar');
      expect(escapeForElasticsearchQuery('foo[bar')).toBe('foo\\[bar');
      expect(escapeForElasticsearchQuery('foo]bar')).toBe('foo\\]bar');
      expect(escapeForElasticsearchQuery('foo^bar')).toBe('foo\\^bar');
      expect(escapeForElasticsearchQuery('foo"bar')).toBe('foo\\"bar');
      expect(escapeForElasticsearchQuery('foo~bar')).toBe('foo\\~bar');
      expect(escapeForElasticsearchQuery('foo*bar')).toBe('foo\\*bar');
      expect(escapeForElasticsearchQuery('foo?bar')).toBe('foo\\?bar');
      expect(escapeForElasticsearchQuery('foo:bar')).toBe('foo\\:bar');
      expect(escapeForElasticsearchQuery('foo\\bar')).toBe('foo\\\\bar');
      expect(escapeForElasticsearchQuery('foo/bar')).toBe('foo\\/bar');
    });
  });
});
