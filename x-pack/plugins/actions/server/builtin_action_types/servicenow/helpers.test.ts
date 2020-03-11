/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { normalizeMapping, buildMap, mapParams } from './helpers';
import { mapping, finalMapping } from './mock';
import { SUPPORTED_SOURCE_FIELDS } from './constants';
import { MapsType } from './types';

const maliciousMapping: MapsType[] = [
  { source: '__proto__', target: 'short_description', actionType: 'nothing' },
  { source: 'description', target: '__proto__', actionType: 'nothing' },
  { source: 'comments', target: 'comments', actionType: 'nothing' },
  { source: 'unsupportedSource', target: 'comments', actionType: 'nothing' },
];

describe('sanitizeMapping', () => {
  test('remove malicious fields', () => {
    const sanitizedMapping = normalizeMapping(SUPPORTED_SOURCE_FIELDS, maliciousMapping);
    expect(sanitizedMapping.every(m => m.source !== '__proto__' && m.target !== '__proto__')).toBe(
      true
    );
  });

  test('remove unsuppported source fields', () => {
    const normalizedMapping = normalizeMapping(SUPPORTED_SOURCE_FIELDS, maliciousMapping);
    expect(normalizedMapping).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'unsupportedSource',
          target: 'comments',
          actionType: 'nothing',
        }),
      ])
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
    const params = {
      caseId: '123',
      incidentId: '456',
      title: 'Incident title',
      description: 'Incident description',
    };

    const fields = mapParams(params, finalMapping);

    expect(fields).toEqual({
      short_description: 'Incident title',
      description: 'Incident description',
    });
  });

  test('do not add fields not in mapping', () => {
    const params = {
      caseId: '123',
      incidentId: '456',
      title: 'Incident title',
      description: 'Incident description',
    };
    const fields = mapParams(params, finalMapping);

    const { title, description, ...unexpectedFields } = params;

    expect(fields).not.toEqual(expect.objectContaining(unexpectedFields));
  });
});
