/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import expect from '@kbn/expect';
import { removeFilterFromQueryString, getQueryPattern } from '../utils';

describe('ML - KqlFilterBar utils', () => {
  const fieldName = 'http.response.status_code';
  const fieldValue = '200';

  describe('removeFilterFromQueryString', () => {

    it('removes selected fieldName/fieldValue from query string with one value', () => {
      const currentQueryString = 'http.response.status_code : "200"';
      const expectedOutput = '';
      const result = removeFilterFromQueryString(currentQueryString, fieldName, fieldValue);
      expect(result).to.be(expectedOutput);
    });

    it('removes selected fieldName/fieldValue of type number from existing query string with one value', () => {
      const currentQueryString = 'http.response.status_code : 200';
      const expectedOutput = '';
      const result = removeFilterFromQueryString(currentQueryString, fieldName, fieldValue);
      expect(result).to.be(expectedOutput);
    });

    it('removes selected fieldName/fieldValue from query string with multiple values', () => {
      const currentQueryString = 'test_field : test_value or http.response.status_code : "200"';
      const expectedOutput = 'test_field : test_value';
      const result = removeFilterFromQueryString(currentQueryString, fieldName, fieldValue);
      expect(result).to.be(expectedOutput);
    });

    it('removes selected fieldName/fieldValue of type number from existing query string with multiple values', () => {
      const currentQueryString = 'http.response.status_code : 200 or test_field : test_value';
      const expectedOutput = 'test_field : test_value';
      const result = removeFilterFromQueryString(currentQueryString, fieldName, fieldValue);
      expect(result).to.be(expectedOutput);
    });

    it('removes \'and\' from end of the query to ensure kuery syntax is valid', () => {
      const currentQueryString = 'http.response.status_code : "200" and';
      const expectedOutput = '';
      const result = removeFilterFromQueryString(currentQueryString, fieldName, fieldValue);
      expect(result).to.be(expectedOutput);
    });

    it('removes \'or\' from end of the query to ensure kuery syntax is valid', () => {
      const currentQueryString = 'http.response.status_code : "200" or';
      const expectedOutput = '';
      const result = removeFilterFromQueryString(currentQueryString, fieldName, fieldValue);
      expect(result).to.be(expectedOutput);
    });

    it('removes \'and\' from start of the query to ensure kuery syntax is valid', () => {
      const currentQueryString = ' and http.response.status_code : "200"';
      const expectedOutput = '';
      const result = removeFilterFromQueryString(currentQueryString, fieldName, fieldValue);
      expect(result).to.be(expectedOutput);
    });

    it('removes \'or\' from start of the query to ensure kuery syntax is valid', () => {
      const currentQueryString = ' or http.response.status_code : "200" ';
      const expectedOutput = '';
      const result = removeFilterFromQueryString(currentQueryString, fieldName, fieldValue);
      expect(result).to.be(expectedOutput);
    });

  });

  describe('getQueryPattern', () => {

    it('creates a regular expression pattern for given fieldName/fieldValue', () => {
      // The source property returns a String containing the source text of the regexp object
      // and it doesn't contain the two forward slashes on both sides and any flags.
      const expectedOutput = /(http.response.status_code)\s?:\s?(")?(200)(")?/i.source;
      const result = getQueryPattern(fieldName, fieldValue).source;
      expect(result).to.be(expectedOutput);
    });

  });

});
