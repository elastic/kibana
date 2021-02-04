/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsClientMock } from '../../../../actions/server/actions_client.mock';
import { flattenCaseSavedObject } from '../../routes/api/utils';
import { mockCases } from '../../routes/api/__fixtures__';

import { BasicParams, ExternalServiceParams, Incident } from './types';
import { comment as commentObj, mappings, defaultPipes, basicParams, userActions } from './mock';

import {
  createIncident,
  prepareFieldsForTransformation,
  transformComments,
  transformers,
  transformFields,
} from './utils';

const formatComment = {
  commentId: commentObj.id,
  comment: 'Wow, good luck catching that bad meanie!',
};

const params = { ...basicParams };

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

      const res = transformFields<BasicParams, ExternalServiceParams, Incident>({
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

      const res = transformFields<BasicParams, ExternalServiceParams, Incident>({
        params: {
          ...params,
          updatedAt: '2020-03-15T08:34:53.450Z',
          updatedBy: {
            username: 'anotherUser',
            full_name: 'Another User',
            email: 'elastic@elastic.co',
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

      const res = transformFields<BasicParams, ExternalServiceParams, Incident>({
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

      const res = transformFields<BasicParams, ExternalServiceParams, Incident>({
        params: {
          ...params,
          createdBy: { full_name: '', username: 'elastic', email: 'elastic@elastic.co' },
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

      const res = transformFields<BasicParams, ExternalServiceParams, Incident>({
        params: {
          ...params,
          updatedAt: '2020-03-15T08:34:53.450Z',
          updatedBy: { username: 'anotherUser', full_name: '', email: 'elastic@elastic.co' },
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
      const comments = [commentObj];
      const res = transformComments(comments, ['informationCreated']);
      expect(res).toEqual([
        {
          ...formatComment,
          comment: `${formatComment.comment} (created at ${comments[0].created_at} by ${comments[0].created_by.full_name})`,
        },
      ]);
    });

    test('transform update comments', () => {
      const comments = [
        {
          ...commentObj,
          updated_at: '2020-03-13T08:34:53.450Z',
          updated_by: {
            full_name: 'Another User',
            username: 'another',
            email: 'elastic@elastic.co',
          },
        },
      ];
      const res = transformComments(comments, ['informationUpdated']);
      expect(res).toEqual([
        {
          ...formatComment,
          comment: `${formatComment.comment} (updated at ${comments[0].updated_at} by ${comments[0].updated_by.full_name})`,
        },
      ]);
    });

    test('transform added comments', () => {
      const comments = [commentObj];
      const res = transformComments(comments, ['informationAdded']);
      expect(res).toEqual([
        {
          ...formatComment,
          comment: `${formatComment.comment} (added at ${comments[0].created_at} by ${comments[0].created_by.full_name})`,
        },
      ]);
    });

    test('transform comments without fullname', () => {
      const comments = [{ ...commentObj, createdBy: { username: commentObj.created_by.username } }];
      // @ts-ignore testing no full_name
      const res = transformComments(comments, ['informationAdded']);
      expect(res).toEqual([
        {
          ...formatComment,
          comment: `${formatComment.comment} (added at ${comments[0].created_at} by ${comments[0].created_by.username})`,
        },
      ]);
    });

    test('adds update user correctly', () => {
      const comments = [
        {
          ...commentObj,
          updated_at: '2020-04-13T08:34:53.450Z',
          updated_by: { full_name: 'Elastic2', username: 'elastic', email: 'elastic@elastic.co' },
        },
      ];
      const res = transformComments(comments, ['informationAdded']);
      expect(res).toEqual([
        {
          ...formatComment,
          comment: `${formatComment.comment} (added at ${comments[0].updated_at} by ${comments[0].updated_by.full_name})`,
        },
      ]);
    });

    test('adds update user with empty fullname correctly', () => {
      const comments = [
        {
          ...commentObj,
          updated_at: '2020-04-13T08:34:53.450Z',
          updated_by: { full_name: '', username: 'elastic2', email: 'elastic@elastic.co' },
        },
      ];
      const res = transformComments(comments, ['informationAdded']);
      expect(res).toEqual([
        {
          ...formatComment,
          comment: `${formatComment.comment} (added at ${comments[0].updated_at} by ${comments[0].updated_by.username})`,
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

  describe('createIncident', () => {
    let actionsMock = actionsClientMock.create();
    const theCase = {
      ...flattenCaseSavedObject({
        savedObject: mockCases[0],
      }),
      comments: [commentObj],
      totalComments: 1,
    };

    const connector = {
      id: '456',
      actionTypeId: '.jira',
      name: 'Connector without isCaseOwned',
      config: {
        apiUrl: 'https://elastic.jira.com',
      },
      isPreconfigured: false,
    };

    it('maps an external incident', async () => {
      const res = await createIncident({
        actionsClient: actionsMock,
        theCase,
        userActions: [],
        connector,
        mappings,
        alerts: [],
      });

      expect(res).toEqual({
        incident: {
          priority: null,
          labels: ['defacement'],
          issueType: null,
          parent: null,
          short_description:
            'Super Bad Security Issue (created at 2019-11-25T21:54:48.952Z by elastic)',
          description:
            'This is a brand new case of a bad meanie defacing data (created at 2019-11-25T21:54:48.952Z by elastic)',
          externalId: null,
        },
        comments: [],
      });
    });

    it('updates an existing incident', async () => {
      const existingIncidentData = {
        priority: null,
        issueType: null,
        parent: null,
        short_description: 'fun title',
        description: 'fun description',
      };

      const execute = jest.fn().mockReturnValue(existingIncidentData);
      actionsMock = { ...actionsMock, execute };

      const res = await createIncident({
        actionsClient: actionsMock,
        theCase,
        userActions,
        connector,
        mappings,
        alerts: [],
      });

      expect(res).toEqual({
        incident: {
          priority: null,
          labels: ['defacement'],
          issueType: null,
          parent: null,
          description:
            'fun description \r\nThis is a brand new case of a bad meanie defacing data (updated at 2019-11-25T21:54:48.952Z by elastic)',
          externalId: 'external-id',
          short_description:
            'Super Bad Security Issue (updated at 2019-11-25T21:54:48.952Z by elastic)',
        },
        comments: [],
      });
    });

    it('throws error when existing incident throws', async () => {
      expect.assertions(2);
      const execute = jest.fn().mockImplementation(() => {
        throw new Error('exception');
      });

      actionsMock = { ...actionsMock, execute };
      createIncident({
        actionsClient: actionsMock,
        theCase,
        userActions,
        connector,
        mappings,
        alerts: [],
      }).catch((e) => {
        expect(e).not.toBeNull();
        expect(e).toEqual(
          new Error(
            `Retrieving Incident by id external-id from .jira failed with exception: Error: exception`
          )
        );
      });
    });
  });
});
