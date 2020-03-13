/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  normalizeMapping,
  buildMap,
  mapParams,
  appendField,
  appendInformationToField,
  appendInformationToIncident,
  applyActionTypeToFields,
  appendInformationToComments,
} from './helpers';
import { mapping, finalMapping } from './mock';
import { SUPPORTED_SOURCE_FIELDS } from './constants';
import { MapsType } from './types';

const maliciousMapping: MapsType[] = [
  { source: '__proto__', target: 'short_description', actionType: 'nothing' },
  { source: 'description', target: '__proto__', actionType: 'nothing' },
  { source: 'comments', target: 'comments', actionType: 'nothing' },
  { source: 'unsupportedSource', target: 'comments', actionType: 'nothing' },
];

const fullParams = {
  caseId: 'd4387ac5-0899-4dc2-bbfa-0dd605c934aa',
  title: 'a title',
  description: 'a description',
  createdAt: '2020-03-13T08:34:53.450Z',
  createdBy: { fullName: 'Elastic User', username: null },
  updatedAt: null,
  updatedBy: null,
  incidentId: null,
  mappedParams: {
    short_description: 'a title',
    description: 'a description',
  },
  comments: [
    {
      commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
      version: 'WzU3LDFd',
      comment: 'first comment',
      createdAt: '2020-03-13T08:34:53.450Z',
      createdBy: { fullName: 'Elastic User', username: null },
      updatedAt: null,
      updatedBy: null,
    },
    {
      commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
      version: 'WzU3LDFd',
      comment: 'second comment',
      createdAt: '2020-03-13T08:34:53.450Z',
      createdBy: { fullName: 'Elastic User', username: null },
      updatedAt: null,
      updatedBy: null,
    },
  ],
};
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

describe('appendField', () => {
  test('prefix correctly', () => {
    expect('my_prefixmy_value ').toEqual(appendField({ value: 'my_value', prefix: 'my_prefix' }));
  });

  test('suffix correctly', () => {
    expect('my_value my_suffix').toEqual(appendField({ value: 'my_value', suffix: 'my_suffix' }));
  });

  test('prefix and suffix correctly', () => {
    expect('my_prefixmy_value my_suffix').toEqual(
      appendField({ value: 'my_value', prefix: 'my_prefix', suffix: 'my_suffix' })
    );
  });
});

describe('appendInformationToField', () => {
  test('creation mode', () => {
    const res = appendInformationToField({
      value: 'my value',
      user: 'Elastic Test User',
      date: '2020-03-13T08:34:53.450Z',
      mode: 'create',
    });
    expect(res).toEqual('my value (created at 2020-03-13T08:34:53.450Z by Elastic Test User)');
  });

  test('update mode', () => {
    const res = appendInformationToField({
      value: 'my value',
      user: 'Elastic Test User',
      date: '2020-03-13T08:34:53.450Z',
      mode: 'update',
    });
    expect(res).toEqual('my value (updated at 2020-03-13T08:34:53.450Z by Elastic Test User)');
  });
});

describe('appendInformationToIncident', () => {
  test('append information correctly on creation mode', () => {
    const res = appendInformationToIncident(fullParams, 'create');
    expect(res).toEqual({
      short_description: 'a title (created at 2020-03-13T08:34:53.450Z by Elastic User)',
      description: 'a description (created at 2020-03-13T08:34:53.450Z by Elastic User)',
    });
  });

  test('append information correctly on update mode', () => {
    const res = appendInformationToIncident(fullParams, 'update');
    expect(res).toEqual({
      short_description: 'a title (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
      description: 'a description (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
    });
  });
});

describe('applyActionTypeToFields', () => {
  test('remove fields with nothing as action type', () => {
    const map: Map<string, any> = new Map();
    map.set('short_description', { target: 'title', actionType: 'nothing' });
    map.set('description', { target: 'description', actionType: 'append' });

    const incident = { title: 'a title', short_description: 'a description' };
    const res = applyActionTypeToFields({
      params: fullParams,
      mapping: map,
      incident,
    });
    expect(res).toEqual(expect.not.objectContaining({ short_description: 'a description' }));
  });

  test('appends correctly a field', () => {
    const map: Map<string, any> = new Map();
    map.set('short_description', { target: 'title', actionType: 'append' });
    map.set('description', { target: 'description', actionType: 'append' });

    const incident = {
      short_description: 'a title (created at 2020-03-13T08:34:53.450Z by Elastic User)',
      description: 'a description (created at 2020-03-13T08:34:53.450Z by Elastic User)',
    };
    const res = applyActionTypeToFields({
      params: { ...fullParams, title: 'update title', description: 'update description' },
      mapping: map,
      incident,
    });

    expect(res).toEqual({
      short_description:
        'a title (updated at 2020-03-13T08:34:53.450Z by Elastic User) a title (created at 2020-03-13T08:34:53.450Z by Elastic User)',
      description:
        'a description (updated at 2020-03-13T08:34:53.450Z by Elastic User) a description (created at 2020-03-13T08:34:53.450Z by Elastic User)',
    });
  });

  test('overwrites correctly a field', () => {
    const map: Map<string, any> = new Map();
    map.set('short_description', { target: 'title', actionType: 'overwrite' });
    map.set('description', { target: 'description', actionType: 'append' });

    const incident = {
      short_description: 'a title (created at 2020-03-13T08:34:53.450Z by Elastic User)',
      description: 'a description (created at 2020-03-13T08:34:53.450Z by Elastic User)',
    };
    const res = applyActionTypeToFields({
      params: { ...fullParams, title: 'update title', description: 'update description' },
      mapping: map,
      incident,
    });

    expect(res).toEqual({
      short_description: 'a title (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
      description:
        'a description (updated at 2020-03-13T08:34:53.450Z by Elastic User) a description (created at 2020-03-13T08:34:53.450Z by Elastic User)',
    });
  });
});

describe('appendInformationToComments', () => {
  test('append information to comments correctly on creation mode', () => {
    const res = appendInformationToComments([fullParams.comments[0]], fullParams, 'create');
    expect(res[0].comment).toEqual(
      'first comment (created at 2020-03-13T08:34:53.450Z by Elastic User)'
    );
  });

  test('append information to comments correctly on update mode', () => {
    const res = appendInformationToComments([fullParams.comments[1]], fullParams, 'update');
    expect(res[0].comment).toEqual(
      'second comment (updated at 2020-03-13T08:34:53.450Z by Elastic User)'
    );
  });
});
