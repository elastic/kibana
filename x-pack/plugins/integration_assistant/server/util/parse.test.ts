/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseNDJSON, parseJSONArray } from './parse';

const simpleNDJSON = `{"message":"test message 1"}\n{"message":"test message 2"}`;
const multilineNDJSON = `{"message":"test message 1"}\n\n{\n  "message":\n  "test message 2"\n}\n\n`;
const splitNDJSON = simpleNDJSON.split('\n');
const complexEventsJSON = `{"events":[\n{"message":"test message 1"},\n{"message":"test message 2"}\n]}`;
const nonIdentifierLikeKeyInJSON = `{"1event":[\n{"message":"test message 1"},\n{"message":"test message 2"}\n]}`;

describe('parseNDJSON', () => {
  const content = [{ message: 'test message 1' }, { message: 'test message 2' }];
  const validNDJSONWithSpaces = `{"message":"test message 1"}
                                 {"message":"test message 2"}`;
  const singlelineArray = '[{"message":"test message 1"}, {"message":"test message 2"}]';
  const multilineArray = '[{"message":"test message 1"},\n{"message":"test message 2"}]';

  it('should parse valid NDJSON', () => {
    expect(parseNDJSON(simpleNDJSON, false)).toEqual(content);
    expect(parseNDJSON(simpleNDJSON, true)).toEqual(content);
  });

  it('should parse valid NDJSON with extra spaces in single-line mode', () => {
    expect(parseNDJSON(validNDJSONWithSpaces, false)).toEqual(content);
  });

  it('should not parse valid NDJSON with extra spaces in multiline mode', () => {
    expect(() => parseNDJSON(validNDJSONWithSpaces, true)).toThrow();
  });

  it('should not parse multiline NDJSON in single-line mode', () => {
    expect(() => parseNDJSON(multilineNDJSON, false)).toThrow();
  });

  it('should parse multiline NDJSON in multiline mode', () => {
    expect(parseNDJSON(multilineNDJSON, true)).toEqual(content);
  });

  it('should parse single-line JSON Array', () => {
    expect(parseNDJSON(singlelineArray, false)).toEqual([content]);
    expect(parseNDJSON(singlelineArray, true)).toEqual([content]);
  });

  it('should not parse a multi-line JSON Array', () => {
    expect(() => parseNDJSON(multilineArray, false)).toThrow();
    expect(() => parseNDJSON(multilineArray, true)).toThrow();
  });

  it('should parse single-line JSON with one entry', () => {
    const fileContent = '{"message":"test message 1"}';
    expect(parseNDJSON(fileContent)).toEqual([{ message: 'test message 1' }]);
  });

  it('should handle empty content', () => {
    expect(parseNDJSON('  ', false)).toEqual([]);
    expect(parseNDJSON('  ', true)).toEqual([]);
  });

  it('should handle empty lines in file content', () => {
    const fileContent = '\n\n{"message":"test message 1"}\n\n{"message":"test message 2"}\n\n';
    expect(parseNDJSON(fileContent, false)).toEqual(content);
    expect(parseNDJSON(fileContent, true)).toEqual(content);
  });
});

describe('parseJSONArray', () => {
  const content = [{ message: 'test message 1' }, { message: 'test message 2' }];
  const singlelineArray = '[{"message":"test message 1"},{"message":"test message 2"}]';
  const multilineArray = '[{"message":"test message 1"},\n{"message":"test message 2"}]';
  const multilineWithSpacesArray =
    '   [ \n\n{"message":  "test message 1"},\n{"message"   :\n\n"test message 2"}\n]\n';
  const malformedJSON = '[{"message":"test message 1"}';

  it('should parse valid JSON array', () => {
    const expected = {
      entries: content,
      pathToEntries: [],
      errorNoArrayFound: false,
    };
    expect(parseJSONArray(singlelineArray)).toEqual(expected);
    expect(parseJSONArray(multilineArray)).toEqual(expected);
    expect(parseJSONArray(multilineWithSpacesArray)).toEqual(expected);
  });

  it('should parse valid JSON object with array entries', () => {
    const expected = {
      entries: content,
      pathToEntries: ['events'],
      errorNoArrayFound: false,
    };
    expect(parseJSONArray(complexEventsJSON)).toEqual(expected);
  });

  it('should pass even if the JSON object with array entries has not an identifier-like key', () => {
    const expected = {
      entries: content,
      pathToEntries: ['1event'],
      errorNoArrayFound: false,
    };
    expect(parseJSONArray(nonIdentifierLikeKeyInJSON)).toEqual(expected);
  });

  it('should return error for JSON that does not contain an array', () => {
    const fileContent = '{"records" : {"message": "test message 1"}}';
    const expected = {
      entries: [],
      pathToEntries: [],
      errorNoArrayFound: true,
    };
    expect(parseJSONArray(fileContent)).toEqual(expected);
  });

  it('should throw an error for invalid JSON object', () => {
    expect(() => parseJSONArray(malformedJSON)).toThrow();
  });
});
