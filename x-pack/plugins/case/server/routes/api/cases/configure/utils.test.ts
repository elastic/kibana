/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  prepareFieldsForTransformation,
  transformFields,
  transformComments,
  transformers,
} from './utils';

import { comment, defaultPipes, mappings, params } from './mock';
import {
  ServiceConnectorCaseParams,
  ExternalServiceParams,
  Incident,
} from '../../../../../common/api/connectors';

describe('api/cases/configure/utils', () => {
  describe('prepareFieldsForTransformation', () => {
    test('prepare fields with defaults', () => {
      const res = prepareFieldsForTransformation({
        defaultPipes,
        params,
        mappings,
      });
      expect(res).toEqual([
        {
          actionType: 'overwrite',
          key: 'short_description',
          pipes: ['informationCreated'],
          value: 'a title',
        },
        {
          actionType: 'append',
          key: 'description',
          pipes: ['informationCreated', 'append'],
          value: 'a description',
        },
      ]);
    });

    test('prepare fields with default pipes', () => {
      const res = prepareFieldsForTransformation({
        defaultPipes: ['myTestPipe'],
        mappings,
        params,
      });
      expect(res).toEqual([
        {
          actionType: 'overwrite',
          key: 'short_description',
          pipes: ['myTestPipe'],
          value: 'a title',
        },
        {
          actionType: 'append',
          key: 'description',
          pipes: ['myTestPipe', 'append'],
          value: 'a description',
        },
      ]);
    });
  });
  describe('transformFields', () => {
    test('transform fields for creation correctly', () => {
      const fields = prepareFieldsForTransformation({
        defaultPipes,
        mappings,
        params,
      });

      const res = transformFields<ServiceConnectorCaseParams, ExternalServiceParams, Incident>({
        params,
        fields,
      });

      expect(res).toEqual({
        short_description: 'a title (created at 2020-03-13T08:34:53.450Z by Elastic User)',
        description: 'a description (created at 2020-03-13T08:34:53.450Z by Elastic User)',
      });
    });

    test('transform fields for update correctly', () => {
      const fields = prepareFieldsForTransformation({
        params,
        mappings,
        defaultPipes: ['informationUpdated'],
      });

      const res = transformFields<ServiceConnectorCaseParams, ExternalServiceParams, Incident>({
        params: {
          ...params,
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

    test('add newline character to description', () => {
      const fields = prepareFieldsForTransformation({
        params,
        mappings,
        defaultPipes: ['informationUpdated'],
      });

      const res = transformFields<ServiceConnectorCaseParams, ExternalServiceParams, Incident>({
        params,
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
        defaultPipes,
        mappings,
        params,
      });

      const res = transformFields<ServiceConnectorCaseParams, ExternalServiceParams, Incident>({
        params: {
          ...params,
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
        defaultPipes: ['informationUpdated'],
        mappings,
        params,
      });

      const res = transformFields<ServiceConnectorCaseParams, ExternalServiceParams, Incident>({
        params: {
          ...params,
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
      const comments = [
        {
          ...comment,
          updatedAt: null,
          updatedBy: null,
        },
      ];
      const res = transformComments(comments, ['informationCreated']);
      expect(res).toEqual([
        {
          ...comment,
          updatedAt: null,
          updatedBy: null,
        },
      ]);
    });

    test('transform update comments', () => {
      const comments = [comment];
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
      const comments = [
        {
          ...comment,
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
      const comments = [
        {
          ...comment,
          updatedAt: null,
          updatedBy: null,
        },
      ];
      const res = transformComments(comments, ['informationAdded']);
      expect(res).toEqual([
        {
          ...comment,
          updatedAt: null,
          updatedBy: null,
        },
      ]);
    });

    test('adds update user correctly', () => {
      const comments = [
        {
          ...comment,
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
      const comments = [
        {
          ...comment,
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
  describe('transformers', () => {
    const { informationCreated, informationUpdated, informationAdded, append } = transformers;
    describe('informationCreated', () => {
      test('transforms correctly', () => {
        const res = informationCreated({
          value: 'a value',
          date: '2020-04-15T08:19:27.400Z',
          user: 'elastic',
        });
        expect(res).toEqual({ value: 'a value (created at 2020-04-15T08:19:27.400Z by elastic)' });
      });

      test('transforms correctly without optional fields', () => {
        const res = informationCreated({
          value: 'a value',
        });
        expect(res).toEqual({ value: 'a value (created at  by )' });
      });

      test('returns correctly rest fields', () => {
        const res = informationCreated({
          value: 'a value',
          date: '2020-04-15T08:19:27.400Z',
          user: 'elastic',
          previousValue: 'previous value',
        });
        expect(res).toEqual({
          value: 'a value (created at 2020-04-15T08:19:27.400Z by elastic)',
          previousValue: 'previous value',
        });
      });
    });

    describe('informationUpdated', () => {
      test('transforms correctly', () => {
        const res = informationUpdated({
          value: 'a value',
          date: '2020-04-15T08:19:27.400Z',
          user: 'elastic',
        });
        expect(res).toEqual({ value: 'a value (updated at 2020-04-15T08:19:27.400Z by elastic)' });
      });

      test('transforms correctly without optional fields', () => {
        const res = informationUpdated({
          value: 'a value',
        });
        expect(res).toEqual({ value: 'a value (updated at  by )' });
      });

      test('returns correctly rest fields', () => {
        const res = informationUpdated({
          value: 'a value',
          date: '2020-04-15T08:19:27.400Z',
          user: 'elastic',
          previousValue: 'previous value',
        });
        expect(res).toEqual({
          value: 'a value (updated at 2020-04-15T08:19:27.400Z by elastic)',
          previousValue: 'previous value',
        });
      });
    });

    describe('informationAdded', () => {
      test('transforms correctly', () => {
        const res = informationAdded({
          value: 'a value',
          date: '2020-04-15T08:19:27.400Z',
          user: 'elastic',
        });
        expect(res).toEqual({ value: 'a value (added at 2020-04-15T08:19:27.400Z by elastic)' });
      });

      test('transforms correctly without optional fields', () => {
        const res = informationAdded({
          value: 'a value',
        });
        expect(res).toEqual({ value: 'a value (added at  by )' });
      });

      test('returns correctly rest fields', () => {
        const res = informationAdded({
          value: 'a value',
          date: '2020-04-15T08:19:27.400Z',
          user: 'elastic',
          previousValue: 'previous value',
        });
        expect(res).toEqual({
          value: 'a value (added at 2020-04-15T08:19:27.400Z by elastic)',
          previousValue: 'previous value',
        });
      });
    });

    describe('append', () => {
      test('transforms correctly', () => {
        const res = append({
          value: 'a value',
          previousValue: 'previous value',
        });
        expect(res).toEqual({ value: 'previous value \r\na value' });
      });

      test('transforms correctly without optional fields', () => {
        const res = append({
          value: 'a value',
        });
        expect(res).toEqual({ value: 'a value' });
      });

      test('returns correctly rest fields', () => {
        const res = append({
          value: 'a value',
          user: 'elastic',
          previousValue: 'previous value',
        });
        expect(res).toEqual({
          value: 'previous value \r\na value',
          user: 'elastic',
        });
      });
    });
  });
});
