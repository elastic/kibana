/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { convertKeysToSnakeCaseDeep, convertKeysToCamelCaseDeep } from '../key_case_converter';

describe('key_case_converter', () => {

  let testObject;

  beforeEach(() => {
    testObject = {
      topLevelKey1: {
        innerLevelKey1: 17,
        inner_level_key2: [ 19, 31 ],
      },
      top_level_key2: {
        innerLevelKey1: 'foo_fooFoo',
        inner_level_key2: [
          { foo_bar: 29 },
          { barBar: 37 }
        ]
      }
    };
  });

  describe('convertKeysToSnakeCaseDeep', () => {

    it ('should recursively convert camelCase keys to snake_case keys', () => {
      const expectedResultObject = {
        top_level_key_1: {
          inner_level_key_1: 17,
          inner_level_key_2: [ 19, 31 ],
        },
        top_level_key_2: {
          inner_level_key_1: 'foo_fooFoo',
          inner_level_key_2: [
            { foo_bar: 29 },
            { bar_bar: 37 }
          ]
        }
      };
      expect(convertKeysToSnakeCaseDeep(testObject)).to.eql(expectedResultObject);
    });

    it ('should not modify original object', () => {
      convertKeysToSnakeCaseDeep(testObject);
      expect(Object.keys(testObject)).to.contain('topLevelKey1');
      expect(Object.keys(testObject.topLevelKey1)).to.contain('innerLevelKey1');
    });

    it ('should preserve inner arrays', () => {
      const result = convertKeysToSnakeCaseDeep(testObject);
      expect(testObject.topLevelKey1.inner_level_key2).to.be.an(Array);
      expect(result.top_level_key_1.inner_level_key_2).to.be.an(Array);
    });

    it ('should preserve top-level arrays', () => {
      testObject = [
        { foo_bar: 17 },
        [ 19, { barBaz: 'qux' } ]
      ];
      const expectedResultObject = [
        { foo_bar: 17 },
        [ 19, { bar_baz: 'qux' } ]
      ];
      const result = convertKeysToSnakeCaseDeep(testObject);
      expect(testObject).to.be.an(Array);
      expect(testObject[1]).to.be.an(Array);
      expect(result).to.be.an(Array);
      expect(result[1]).to.be.an(Array);
      expect(result).to.eql(expectedResultObject);
    });

    it ('should throw an error if something other an object or array is passed in', () => {
      const expectedErrorMessageRegexp = /Specified object should be an Object or Array/;
      expect(convertKeysToSnakeCaseDeep).withArgs('neither an object nor an array').to.throwException(expectedErrorMessageRegexp);
    });
  });

  describe('convertKeysToCamelCaseDeep', () => {

    it ('should recursively convert snake_case keys to camelCase keys', () => {
      const expectedResultObject = {
        topLevelKey1: {
          innerLevelKey1: 17,
          innerLevelKey2: [ 19, 31 ],
        },
        topLevelKey2: {
          innerLevelKey1: 'foo_fooFoo',
          innerLevelKey2: [
            { fooBar: 29 },
            { barBar: 37 }
          ]
        }
      };
      expect(convertKeysToCamelCaseDeep(testObject)).to.eql(expectedResultObject);
    });

    it ('should not modify original object', () => {
      convertKeysToCamelCaseDeep(testObject);
      expect(Object.keys(testObject)).to.contain('top_level_key2');
      expect(Object.keys(testObject.topLevelKey1)).to.contain('inner_level_key2');
    });

    it ('should preserve inner arrays', () => {
      const result = convertKeysToCamelCaseDeep(testObject);
      expect(testObject.topLevelKey1.inner_level_key2).to.be.an(Array);
      expect(result.topLevelKey1.innerLevelKey2).to.be.an(Array);
    });

    it ('should preserve top-level arrays', () => {
      testObject = [
        { foo_bar: 17 },
        [ 19, { barBaz: 'qux' } ]
      ];
      const expectedResultObject = [
        { fooBar: 17 },
        [ 19, { barBaz: 'qux' } ]
      ];
      const result = convertKeysToCamelCaseDeep(testObject);
      expect(testObject).to.be.an(Array);
      expect(testObject[1]).to.be.an(Array);
      expect(result).to.be.an(Array);
      expect(result[1]).to.be.an(Array);
      expect(result).to.eql(expectedResultObject);
    });

    it ('should throw an error if something other an object or array is passed in', () => {
      const expectedErrorMessageRegexp = /Specified object should be an Object or Array/;
      expect(convertKeysToCamelCaseDeep).withArgs('neither an object nor an array').to.throwException(expectedErrorMessageRegexp);
    });
  });
});
