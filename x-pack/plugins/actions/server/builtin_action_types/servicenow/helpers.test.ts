/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sanitizeMapping, buildMap, mapParams } from './helpers';
import { mapping, maliciousMapping, finalMapping, params } from './mock';
import { SUPPORTED_SOURCE_FIELDS } from './constants';

describe('sanitizeMapping', () => {
  test('remove malicious fields', () => {
    const sanitizedMapping = sanitizeMapping(SUPPORTED_SOURCE_FIELDS, maliciousMapping);
    expect(sanitizedMapping.every(m => m.source !== '__proto__' && m.target !== '__proto__')).toBe(
      true
    );
  });

  test('remove unsuppported source fields', () => {
    const sanitizedMapping = sanitizeMapping(SUPPORTED_SOURCE_FIELDS, maliciousMapping);
    expect(sanitizedMapping).not.toEqual(
      expect.arrayContaining([expect.objectContaining(maliciousMapping[3])])
    );
  });
});

describe('buildMap', () => {
  test('builds sanitized Map', () => {
    const finalMap = buildMap(maliciousMapping);
    expect(finalMap.get('__proto__')).not.toBeDefined();
  });

  test('builds Map correct', () => {
    const final = buildMap(mapping);
    expect(final).toEqual(finalMapping);
  });
});

describe('mapParams', () => {
  test('maps params correctly', () => {
    const { comments, ...restParams } = params;
    const fields = mapParams(restParams, finalMapping);
    expect(fields).toEqual({
      [finalMapping.get('title').target]: restParams.title,
      [finalMapping.get('description').target]: restParams.description,
    });
  });

  test('do not add fields not in mapping', () => {
    const { comments, ...restParams } = params;
    const fields = mapParams(restParams, finalMapping);
    const { title, description, ...unexpectedFields } = restParams;
    expect(fields).not.toEqual(expect.objectContaining(unexpectedFields));
  });
});
