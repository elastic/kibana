/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import expect from '@kbn/expect';
import {
  replaceStringTokens,
  detectorToString,
  sortByKey,
  guessTimeFormat,
  toLocaleString,
  mlEscape,
  escapeForElasticsearchQuery,
  isWebUrl
} from '../string_utils';


describe('ML - string utils', () => {

  describe('replaceStringTokens', () => {

    const testRecord = {
      'job_id': 'test_job',
      'result_type': 'record',
      'probability': 0.0191711,
      'record_score': 4.3,
      'bucket_span': 300,
      'detector_index': 0,
      'timestamp': 1454890500000,
      'function': 'mean',
      'function_description': 'mean',
      'field_name': 'responsetime',
      'user': 'Des O\'Connor',
      'testfield1': 'test$tring=[+-?]',
      'testfield2': '{<()>}',
      'testfield3': 'host=\\\\test@uk.dev'
    };

    it('returns correct values without URI encoding', () => {
      const result = replaceStringTokens('user=$user$,time=$timestamp$', testRecord, false);
      expect(result).to.be('user=Des O\'Connor,time=1454890500000');
    });

    it('returns correct values for missing token without URI encoding', () => {
      const result = replaceStringTokens('user=$username$,time=$timestamp$', testRecord, false);
      expect(result).to.be('user=$username$,time=1454890500000');
    });

    it('returns correct values with URI encoding', () => {
      const testString1 = 'https://www.google.co.uk/webhp#q=$testfield1$';
      const testString2 = 'https://www.google.co.uk/webhp#q=$testfield2$';
      const testString3 = 'https://www.google.co.uk/webhp#q=$testfield3$';
      const testString4 = 'https://www.google.co.uk/webhp#q=$user$';

      const result1 = replaceStringTokens(testString1, testRecord, true);
      const result2 = replaceStringTokens(testString2, testRecord, true);
      const result3 = replaceStringTokens(testString3, testRecord, true);
      const result4 = replaceStringTokens(testString4, testRecord, true);

      expect(result1).to.be('https://www.google.co.uk/webhp#q=test%24tring%3D%5B%2B-%3F%5D');
      expect(result2).to.be('https://www.google.co.uk/webhp#q=%7B%3C()%3E%7D');
      expect(result3).to.be('https://www.google.co.uk/webhp#q=host%3D%5C%5Ctest%40uk.dev');
      expect(result4).to.be('https://www.google.co.uk/webhp#q=Des%20O\'Connor');
    });

    it('returns correct values for missing token with URI encoding', () => {
      const testString = 'https://www.google.co.uk/webhp#q=$username$&time=$timestamp$';
      const result = replaceStringTokens(testString, testRecord, true);
      expect(result).to.be('https://www.google.co.uk/webhp#q=$username$&time=1454890500000');
    });

  });

  describe('detectorToString', () => {

    it('returns the correct descriptions for detectors', () => {
      const detector1 = {
        'function': 'count',
      };

      const detector2 = {
        'function': 'count',
        'by_field_name': 'airline',
        'use_null': false
      };

      const detector3 = {
        'function': 'mean',
        'field_name': 'CPUUtilization',
        'partition_field_name': 'region',
        'by_field_name': 'host',
        'over_field_name': 'user',
        'exclude_frequent': 'all'
      };

      expect(detectorToString(detector1)).to.be('count');
      expect(detectorToString(detector2)).to.be('count by airline use_null=false');
      expect(detectorToString(detector3)).to.be(
        'mean(CPUUtilization) by host over user partition_field_name=region exclude_frequent=all');
    });

  });

  describe('sortByKey', () => {
    const obj = {
      'zebra': 'stripes',
      'giraffe': 'neck',
      'elephant': 'trunk'
    };

    const valueComparator = function (value) {
      return value;
    };

    it('returns correct ordering with default comparator', () => {
      const result = sortByKey(obj, false);
      const keys = Object.keys(result);
      expect(keys[0]).to.be('elephant');
      expect(keys[1]).to.be('giraffe');
      expect(keys[2]).to.be('zebra');
    });

    it('returns correct ordering with default comparator and order reversed', () => {
      const result = sortByKey(obj, true);
      const keys = Object.keys(result);
      expect(keys[0]).to.be('zebra');
      expect(keys[1]).to.be('giraffe');
      expect(keys[2]).to.be('elephant');
    });

    it('returns correct ordering with comparator', () => {
      const result = sortByKey(obj, false, valueComparator);
      const keys = Object.keys(result);
      expect(keys[0]).to.be('giraffe');
      expect(keys[1]).to.be('zebra');
      expect(keys[2]).to.be('elephant');
    });

    it('returns correct ordering with comparator and order reversed', () => {
      const result = sortByKey(obj, true, valueComparator);
      const keys = Object.keys(result);
      expect(keys[0]).to.be('elephant');
      expect(keys[1]).to.be('zebra');
      expect(keys[2]).to.be('giraffe');
    });

  });

  describe('guessTimeFormat', () => {
    it('returns correct format for various dates', () => {
      expect(guessTimeFormat('2017-03-24T00:00')).to.be('yyyy-MM-dd\'T\'HH:mm');
      expect(guessTimeFormat('2017-03-24 00:00')).to.be('yyyy-MM-dd HH:mm');
      expect(guessTimeFormat('2017-03-24 00:00:00')).to.be('yyyy-MM-dd HH:mm:ss');
      expect(guessTimeFormat('2017-03-24 00:00:00Z')).to.be('yyyy-MM-dd HH:mm:ssX');
      expect(guessTimeFormat('2017-03-24 00:00:00.000')).to.be('yyyy-MM-dd HH:mm:ss.SSS');
      expect(guessTimeFormat('2017-03-24 00:00:00:000')).to.be('yyyy-MM-dd HH:mm:ss:SSS');
      expect(guessTimeFormat('2017-03-24 00:00:00.000+00:00:00')).to.be('yyyy-MM-dd HH:mm:ss.SSSXXXXX');
      expect(guessTimeFormat('2017-03-24 00:00:00.000+00:00')).to.be('yyyy-MM-dd HH:mm:ss.SSSXXX');
      expect(guessTimeFormat('2017-03-24 00:00:00.000+000000')).to.be('yyyy-MM-dd HH:mm:ss.SSSXXXX');
      expect(guessTimeFormat('2017-03-24 00:00:00.000+0000')).to.be('yyyy-MM-dd HH:mm:ss.SSSZ');
      expect(guessTimeFormat('2017-03-24 00:00:00.000+00')).to.be('yyyy-MM-dd HH:mm:ss.SSSX');
      expect(guessTimeFormat('2017-03-24 00:00:00.000Z')).to.be('yyyy-MM-dd HH:mm:ss.SSSX');
      expect(guessTimeFormat('2017-03-24 00:00:00.000 GMT')).to.be('yyyy-MM-dd HH:mm:ss.SSS zzz');
      expect(guessTimeFormat('2017-03-24 00:00:00 GMT')).to.be('yyyy-MM-dd HH:mm:ss zzz');
      expect(guessTimeFormat('2017 03 24 00:00:00.000')).to.be('yyyy MM dd HH:mm:ss.SSS');
      expect(guessTimeFormat('2017.03.24 00:00:00.000')).to.be('yyyy.MM.dd HH:mm:ss.SSS');
      expect(guessTimeFormat('2017/03/24 00:00:00.000')).to.be('yyyy/MM/dd HH:mm:ss.SSS');
      expect(guessTimeFormat('24/03/2017 00:00:00.000')).to.be('dd/MM/yyyy HH:mm:ss.SSS');
      expect(guessTimeFormat('03 24 2017 00:00:00.000')).to.be('MM dd yyyy HH:mm:ss.SSS');
      expect(guessTimeFormat('03/24/2017 00:00:00.000')).to.be('MM/dd/yyyy HH:mm:ss.SSS');
      expect(guessTimeFormat('2017 Mar 24 00:00:00.000')).to.be('yyyy MMM dd HH:mm:ss.SSS');
      expect(guessTimeFormat('Mar 24 2017 00:00:00.000')).to.be('MMM dd yyyy HH:mm:ss.SSS');
      expect(guessTimeFormat('24 Mar 2017 00:00:00.000')).to.be('dd MMM yyyy HH:mm:ss.SSS');
      expect(guessTimeFormat('1490313600')).to.be('epoch');
      expect(guessTimeFormat('1490313600000')).to.be('epoch_ms');
    });
  });

  describe('toLocaleString', () => {
    it('returns correct comma placement for large numbers', () => {
      expect(toLocaleString(1)).to.be('1');
      expect(toLocaleString(10)).to.be('10');
      expect(toLocaleString(100)).to.be('100');
      expect(toLocaleString(1000)).to.be('1,000');
      expect(toLocaleString(10000)).to.be('10,000');
      expect(toLocaleString(100000)).to.be('100,000');
      expect(toLocaleString(1000000)).to.be('1,000,000');
      expect(toLocaleString(10000000)).to.be('10,000,000');
      expect(toLocaleString(100000000)).to.be('100,000,000');
      expect(toLocaleString(1000000000)).to.be('1,000,000,000');
    });
  });

  describe('mlEscape', () => {
    it('returns correct escaping of characters', () => {
      expect(mlEscape('foo&bar')).to.be('foo&amp;bar');
      expect(mlEscape('foo<bar')).to.be('foo&lt;bar');
      expect(mlEscape('foo>bar')).to.be('foo&gt;bar');
      expect(mlEscape('foo"bar')).to.be('foo&quot;bar');
      expect(mlEscape('foo\'bar')).to.be('foo&#39;bar');
      expect(mlEscape('foo/bar')).to.be('foo&#x2F;bar');
    });
  });

  describe('escapeForElasticsearchQuery', () => {
    it('returns correct escaping of reserved elasticsearch characters', () => {
      expect(escapeForElasticsearchQuery('foo+bar')).to.be('foo\\+bar');
      expect(escapeForElasticsearchQuery('foo-bar')).to.be('foo\\-bar');
      expect(escapeForElasticsearchQuery('foo=bar')).to.be('foo\\=bar');
      expect(escapeForElasticsearchQuery('foo&&bar')).to.be('foo\\&\\&bar');
      expect(escapeForElasticsearchQuery('foo||bar')).to.be('foo\\|\\|bar');
      expect(escapeForElasticsearchQuery('foo>bar')).to.be('foo\\>bar');
      expect(escapeForElasticsearchQuery('foo<bar')).to.be('foo\\<bar');
      expect(escapeForElasticsearchQuery('foo!bar')).to.be('foo\\!bar');
      expect(escapeForElasticsearchQuery('foo(bar')).to.be('foo\\(bar');
      expect(escapeForElasticsearchQuery('foo)bar')).to.be('foo\\)bar');
      expect(escapeForElasticsearchQuery('foo{bar')).to.be('foo\\{bar');
      expect(escapeForElasticsearchQuery('foo[bar')).to.be('foo\\[bar');
      expect(escapeForElasticsearchQuery('foo]bar')).to.be('foo\\]bar');
      expect(escapeForElasticsearchQuery('foo^bar')).to.be('foo\\^bar');
      expect(escapeForElasticsearchQuery('foo"bar')).to.be('foo\\"bar');
      expect(escapeForElasticsearchQuery('foo~bar')).to.be('foo\\~bar');
      expect(escapeForElasticsearchQuery('foo*bar')).to.be('foo\\*bar');
      expect(escapeForElasticsearchQuery('foo?bar')).to.be('foo\\?bar');
      expect(escapeForElasticsearchQuery('foo:bar')).to.be('foo\\:bar');
      expect(escapeForElasticsearchQuery('foo\\bar')).to.be('foo\\\\bar');
      expect(escapeForElasticsearchQuery('foo/bar')).to.be('foo\\/bar');
    });
  });

  describe('isWebUrl', () => {
    it('returns true for http URLs', () => {
      expect(isWebUrl('http://airlinecodes.info/airline-code-$airline$')).to.be(true);
      expect(isWebUrl('http://www.google.co.uk/search?q=airline+code+$airline$')).to.be(true);
      expect(isWebUrl('http://showcase.server.com:5601/')).to.be(true);
      expect(isWebUrl('http://10.1.2.3/myapp/query=test')).to.be(true);
    });

    it('returns true for https URLs', () => {
      expect(isWebUrl('https://www.google.co.uk/search?q=airline+code+$airline$')).to.be(true);
    });

    it('returns true for relative web URLs', () => {
      expect(isWebUrl('kibana#/discover?_g=(time:(from:\'$earliest$\',mode:absolute,to:\'$latest$\'))' +
        '&_a=(index:\'38288750-1884-11e8-b207-d9cfd2566581\',query:(language:lucene,query:\'airline:$airline$\'))')).to.be(true);
      expect(isWebUrl('kibana#/dashboard/cc295990-1d19-11e8-b271-015e33f55cb6?' +
        '_g=(time:(from:\'$earliest$\',mode:absolute,to:\'$latest$\'))' +
        '&_a=(filters:!(),query:(language:lucene,query:\'instance:$instance$ AND region:$region$\'))')).to.be(true);

    });

    it('returns false for non web URLs', () => {
      expect(isWebUrl('javascript:console.log(window)')).to.be(false);  // eslint-disable-line no-script-url
      expect(isWebUrl('ftp://admin@10.1.2.3/')).to.be(false);
      expect(isWebUrl('mailto:someone@example.com?Subject=Hello%20again')).to.be(false);
    });
  });

});
