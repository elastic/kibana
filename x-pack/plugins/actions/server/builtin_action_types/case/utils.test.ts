/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  normalizeMapping,
  buildMap,
  mapParams,
  prepareFieldsForTransformation,
  transformFields,
  transformComments,
} from './utils';

import { SUPPORTED_SOURCE_FIELDS } from './constants';
import { Comment, MapRecord, PushToServiceApiParams } from './types';

const mapping: MapRecord[] = [
  { source: 'title', target: 'short_description', actionType: 'overwrite' },
  { source: 'description', target: 'description', actionType: 'append' },
  { source: 'comments', target: 'comments', actionType: 'append' },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const finalMapping: Map<string, any> = new Map();

finalMapping.set('title', {
  target: 'short_description',
  actionType: 'overwrite',
});

finalMapping.set('description', {
  target: 'description',
  actionType: 'append',
});

finalMapping.set('comments', {
  target: 'comments',
  actionType: 'append',
});

finalMapping.set('short_description', {
  target: 'title',
  actionType: 'overwrite',
});

const maliciousMapping: MapRecord[] = [
  { source: '__proto__', target: 'short_description', actionType: 'nothing' },
  { source: 'description', target: '__proto__', actionType: 'nothing' },
  { source: 'comments', target: 'comments', actionType: 'nothing' },
  { source: 'unsupportedSource', target: 'comments', actionType: 'nothing' },
];

const fullParams: PushToServiceApiParams = {
  savedObjectId: 'd4387ac5-0899-4dc2-bbfa-0dd605c934aa',
  title: 'a title',
  description: 'a description',
  createdAt: '2020-03-13T08:34:53.450Z',
  createdBy: { fullName: 'Elastic User', username: 'elastic' },
  updatedAt: null,
  updatedBy: null,
  externalId: null,
  externalCase: {
    short_description: 'a title',
    description: 'a description',
  },
  comments: [
    {
      commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
      comment: 'first comment',
      createdAt: '2020-03-13T08:34:53.450Z',
      createdBy: { fullName: 'Elastic User', username: 'elastic' },
      updatedAt: null,
      updatedBy: null,
    },
    {
      commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
      comment: 'second comment',
      createdAt: '2020-03-13T08:34:53.450Z',
      createdBy: { fullName: 'Elastic User', username: 'elastic' },
      updatedAt: null,
      updatedBy: null,
    },
  ],
};

describe('normalizeMapping', () => {
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
      savedObjectId: '123',
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
      savedObjectId: '123',
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
      externalCase: fullParams.externalCase,
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
      externalCase: fullParams.externalCase,
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
      externalCase: fullParams.externalCase,
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
      externalCase: fullParams.externalCase,
      mapping: finalMapping,
      defaultPipes: ['informationUpdated'],
    });

    const res = transformFields({
      params: {
        ...fullParams,
        updatedAt: '2020-03-15T08:34:53.450Z',
        updatedBy: {
          username: 'anotherUser',
          fullName: 'Another User',
        },
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
      externalCase: fullParams.externalCase,
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
      externalCase: fullParams.externalCase,
      mapping: finalMapping,
    });

    const res = transformFields({
      params: {
        ...fullParams,
        createdBy: { fullName: '', username: 'elastic' },
      },
      fields,
    });

    expect(res).toEqual({
      short_description: 'a title (created at 2020-03-13T08:34:53.450Z by elastic)',
      description: 'a description (created at 2020-03-13T08:34:53.450Z by elastic)',
    });
  });

  test('append username if fullname is undefined when update', () => {
    const fields = prepareFieldsForTransformation({
      externalCase: fullParams.externalCase,
      mapping: finalMapping,
      defaultPipes: ['informationUpdated'],
    });

    const res = transformFields({
      params: {
        ...fullParams,
        updatedAt: '2020-03-15T08:34:53.450Z',
        updatedBy: { username: 'anotherUser', fullName: '' },
      },
      fields,
    });

    expect(res).toEqual({
      short_description: 'a title (updated at 2020-03-15T08:34:53.450Z by anotherUser)',
      description: 'a description (updated at 2020-03-15T08:34:53.450Z by anotherUser)',
    });
  });
});

describe('transformComments', () => {
  test('transform creation comments', () => {
    const comments: Comment[] = [
      {
        commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
        comment: 'first comment',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: { fullName: 'Elastic User', username: 'elastic' },
        updatedAt: null,
        updatedBy: null,
      },
    ];
    const res = transformComments(comments, ['informationCreated']);
    expect(res).toEqual([
      {
        commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
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
        comment: 'first comment',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: { fullName: 'Elastic User', username: 'elastic' },
        updatedAt: '2020-03-15T08:34:53.450Z',
        updatedBy: {
          fullName: 'Another User',
          username: 'anotherUser',
        },
      },
    ];
    const res = transformComments(comments, ['informationUpdated']);
    expect(res).toEqual([
      {
        commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
        comment: 'first comment (updated at 2020-03-15T08:34:53.450Z by Another User)',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: { fullName: 'Elastic User', username: 'elastic' },
        updatedAt: '2020-03-15T08:34:53.450Z',
        updatedBy: {
          fullName: 'Another User',
          username: 'anotherUser',
        },
      },
    ]);
  });

  test('transform added comments', () => {
    const comments: Comment[] = [
      {
        commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
        comment: 'first comment',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: { fullName: 'Elastic User', username: 'elastic' },
        updatedAt: null,
        updatedBy: null,
      },
    ];
    const res = transformComments(comments, ['informationAdded']);
    expect(res).toEqual([
      {
        commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
        comment: 'first comment (added at 2020-03-13T08:34:53.450Z by Elastic User)',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: { fullName: 'Elastic User', username: 'elastic' },
        updatedAt: null,
        updatedBy: null,
      },
    ]);
  });

  test('transform comments without fullname', () => {
    const comments: Comment[] = [
      {
        commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
        comment: 'first comment',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: { fullName: '', username: 'elastic' },
        updatedAt: null,
        updatedBy: null,
      },
    ];
    const res = transformComments(comments, ['informationAdded']);
    expect(res).toEqual([
      {
        commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
        comment: 'first comment (added at 2020-03-13T08:34:53.450Z by elastic)',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: { fullName: '', username: 'elastic' },
        updatedAt: null,
        updatedBy: null,
      },
    ]);
  });

  test('adds update user correctly', () => {
    const comments: Comment[] = [
      {
        commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
        comment: 'first comment',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: { fullName: 'Elastic', username: 'elastic' },
        updatedAt: '2020-04-13T08:34:53.450Z',
        updatedBy: { fullName: 'Elastic2', username: 'elastic' },
      },
    ];
    const res = transformComments(comments, ['informationAdded']);
    expect(res).toEqual([
      {
        commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
        comment: 'first comment (added at 2020-04-13T08:34:53.450Z by Elastic2)',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: { fullName: 'Elastic', username: 'elastic' },
        updatedAt: '2020-04-13T08:34:53.450Z',
        updatedBy: { fullName: 'Elastic2', username: 'elastic' },
      },
    ]);
  });

  test('adds update user with empty fullname correctly', () => {
    const comments: Comment[] = [
      {
        commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
        comment: 'first comment',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: { fullName: 'Elastic', username: 'elastic' },
        updatedAt: '2020-04-13T08:34:53.450Z',
        updatedBy: { fullName: '', username: 'elastic2' },
      },
    ];
    const res = transformComments(comments, ['informationAdded']);
    expect(res).toEqual([
      {
        commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
        comment: 'first comment (added at 2020-04-13T08:34:53.450Z by elastic2)',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: { fullName: 'Elastic', username: 'elastic' },
        updatedAt: '2020-04-13T08:34:53.450Z',
        updatedBy: { fullName: '', username: 'elastic2' },
      },
    ]);
  });
});
