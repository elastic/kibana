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
  prepareFieldsForTransformation,
  transformFields,
  transformComments,
} from './helpers';
import { mapping, finalMapping } from './mock';
import { SUPPORTED_SOURCE_FIELDS } from './constants';
import { MapEntry, Params, Comment } from './types';

const maliciousMapping: MapEntry[] = [
  { source: '__proto__', target: 'short_description', actionType: 'nothing' },
  { source: 'description', target: '__proto__', actionType: 'nothing' },
  { source: 'comments', target: 'comments', actionType: 'nothing' },
  { source: 'unsupportedSource', target: 'comments', actionType: 'nothing' },
];

const fullParams: Params = {
  caseId: 'd4387ac5-0899-4dc2-bbfa-0dd605c934aa',
  title: 'a title',
  description: 'a description',
  createdAt: '2020-03-13T08:34:53.450Z',
  createdBy: { fullName: 'Elastic User', username: 'elastic' },
  updatedAt: null,
  updatedBy: null,
  incidentId: null,
  incident: {
    short_description: 'a title',
    description: 'a description',
  },
  comments: [
    {
      commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
      version: 'WzU3LDFd',
      comment: 'first comment',
      createdAt: '2020-03-13T08:34:53.450Z',
      createdBy: { fullName: 'Elastic User', username: 'elastic' },
      updatedAt: null,
      updatedBy: null,
    },
    {
      commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
      version: 'WzU3LDFd',
      comment: 'second comment',
      createdAt: '2020-03-13T08:34:53.450Z',
      createdBy: { fullName: 'Elastic User', username: 'elastic' },
      updatedAt: null,
      updatedBy: null,
    },
  ],
};

describe('sanitizeMapping', () => {
  test('remove malicious fields', () => {
    const sanitizedMapping = normalizeMapping(SUPPORTED_SOURCE_FIELDS, maliciousMapping);
    expect(
      sanitizedMapping.every((m) => m.source !== '__proto__' && m.target !== '__proto__')
    ).toBe(true);
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

describe('prepareFieldsForTransformation', () => {
  test('prepare fields with defaults', () => {
    const res = prepareFieldsForTransformation({
      params: fullParams,
      mapping: finalMapping,
    });
    expect(res).toEqual([
      {
        key: 'short_description',
        value: 'a title',
        actionType: 'overwrite',
        pipes: ['informationCreated'],
      },
      {
        key: 'description',
        value: 'a description',
        actionType: 'append',
        pipes: ['informationCreated', 'append'],
      },
    ]);
  });

  test('prepare fields with default pipes', () => {
    const res = prepareFieldsForTransformation({
      params: fullParams,
      mapping: finalMapping,
      defaultPipes: ['myTestPipe'],
    });
    expect(res).toEqual([
      {
        key: 'short_description',
        value: 'a title',
        actionType: 'overwrite',
        pipes: ['myTestPipe'],
      },
      {
        key: 'description',
        value: 'a description',
        actionType: 'append',
        pipes: ['myTestPipe', 'append'],
      },
    ]);
  });
});

describe('transformFields', () => {
  test('transform fields for creation correctly', () => {
    const fields = prepareFieldsForTransformation({
      params: fullParams,
      mapping: finalMapping,
    });

    const res = transformFields({
      params: fullParams,
      fields,
    });

    expect(res).toEqual({
      short_description: 'a title (created at 2020-03-13T08:34:53.450Z by Elastic User)',
      description: 'a description (created at 2020-03-13T08:34:53.450Z by Elastic User)',
    });
  });

  test('transform fields for update correctly', () => {
    const fields = prepareFieldsForTransformation({
      params: {
        ...fullParams,
        updatedAt: '2020-03-15T08:34:53.450Z',
        updatedBy: { username: 'anotherUser', fullName: 'Another User' },
      },
      mapping: finalMapping,
      defaultPipes: ['informationUpdated'],
    });

    const res = transformFields({
      params: {
        ...fullParams,
        updatedAt: '2020-03-15T08:34:53.450Z',
        updatedBy: { username: 'anotherUser', fullName: 'Another User' },
      },
      fields,
      currentIncident: {
        short_description: 'first title (created at 2020-03-13T08:34:53.450Z by Elastic User)',
        description: 'first description (created at 2020-03-13T08:34:53.450Z by Elastic User)',
      },
    });
    expect(res).toEqual({
      short_description: 'a title (updated at 2020-03-15T08:34:53.450Z by Another User)',
      description:
        'first description (created at 2020-03-13T08:34:53.450Z by Elastic User) \r\na description (updated at 2020-03-15T08:34:53.450Z by Another User)',
    });
  });

  test('add newline character to descripton', () => {
    const fields = prepareFieldsForTransformation({
      params: fullParams,
      mapping: finalMapping,
      defaultPipes: ['informationUpdated'],
    });

    const res = transformFields({
      params: fullParams,
      fields,
      currentIncident: {
        short_description: 'first title',
        description: 'first description',
      },
    });
    expect(res.description?.includes('\r\n')).toBe(true);
  });

  test('append username if fullname is undefined when create', () => {
    const fields = prepareFieldsForTransformation({
      params: fullParams,
      mapping: finalMapping,
    });

    const res = transformFields({
      params: { ...fullParams, createdBy: { fullName: null, username: 'elastic' } },
      fields,
    });

    expect(res).toEqual({
      short_description: 'a title (created at 2020-03-13T08:34:53.450Z by elastic)',
      description: 'a description (created at 2020-03-13T08:34:53.450Z by elastic)',
    });
  });

  test('append username if fullname is undefined when update', () => {
    const fields = prepareFieldsForTransformation({
      params: {
        ...fullParams,
        updatedAt: '2020-03-15T08:34:53.450Z',
        updatedBy: { username: 'anotherUser', fullName: 'Another User' },
      },
      mapping: finalMapping,
      defaultPipes: ['informationUpdated'],
    });

    const res = transformFields({
      params: {
        ...fullParams,
        updatedAt: '2020-03-15T08:34:53.450Z',
        updatedBy: { username: 'anotherUser', fullName: null },
      },
      fields,
    });

    expect(res).toEqual({
      short_description: 'a title (updated at 2020-03-15T08:34:53.450Z by anotherUser)',
      description: 'a description (updated at 2020-03-15T08:34:53.450Z by anotherUser)',
    });
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

  test('add mode', () => {
    const res = appendInformationToField({
      value: 'my value',
      user: 'Elastic Test User',
      date: '2020-03-13T08:34:53.450Z',
      mode: 'add',
    });
    expect(res).toEqual('my value (added at 2020-03-13T08:34:53.450Z by Elastic Test User)');
  });
});

describe('transformComments', () => {
  test('transform creation comments', () => {
    const comments: Comment[] = [
      {
        commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
        version: 'WzU3LDFd',
        comment: 'first comment',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: { fullName: 'Elastic User', username: 'elastic' },
        updatedAt: null,
        updatedBy: null,
      },
    ];
    const res = transformComments(comments, fullParams, ['informationCreated']);
    expect(res).toEqual([
      {
        commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
        version: 'WzU3LDFd',
        comment: 'first comment (created at 2020-03-13T08:34:53.450Z by Elastic User)',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: { fullName: 'Elastic User', username: 'elastic' },
        updatedAt: null,
        updatedBy: null,
      },
    ]);
  });

  test('transform update comments', () => {
    const comments: Comment[] = [
      {
        commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
        version: 'WzU3LDFd',
        comment: 'first comment',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: { fullName: 'Elastic User', username: 'elastic' },
        updatedAt: '2020-03-15T08:34:53.450Z',
        updatedBy: { fullName: 'Another User', username: 'anotherUser' },
      },
    ];
    const res = transformComments(comments, fullParams, ['informationUpdated']);
    expect(res).toEqual([
      {
        commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
        version: 'WzU3LDFd',
        comment: 'first comment (updated at 2020-03-15T08:34:53.450Z by Another User)',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: { fullName: 'Elastic User', username: 'elastic' },
        updatedAt: '2020-03-15T08:34:53.450Z',
        updatedBy: { fullName: 'Another User', username: 'anotherUser' },
      },
    ]);
  });
  test('transform added comments', () => {
    const comments: Comment[] = [
      {
        commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
        version: 'WzU3LDFd',
        comment: 'first comment',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: { fullName: 'Elastic User', username: 'elastic' },
        updatedAt: null,
        updatedBy: null,
      },
    ];
    const res = transformComments(comments, fullParams, ['informationAdded']);
    expect(res).toEqual([
      {
        commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
        version: 'WzU3LDFd',
        comment: 'first comment (added at 2020-03-13T08:34:53.450Z by Elastic User)',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: { fullName: 'Elastic User', username: 'elastic' },
        updatedAt: null,
        updatedBy: null,
      },
    ]);
  });
});
