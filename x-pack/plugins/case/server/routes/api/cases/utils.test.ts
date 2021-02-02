/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicParams, ExternalServiceParams, Incident } from '../../../../common/api';

import {
  createIncident,
  prepareFieldsForTransformation,
  transformComments,
  transformers,
  transformFields,
} from './utils';

import { comment as commentObj, mappings, defaultPipes, basicParams, updateUser } from './mock';
import { actionsClientMock } from '../../../../../actions/server/actions_client.mock';
import { flattenCaseSavedObject } from '../utils';
import { mockCases } from '../__fixtures__';

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
          ...updateUser,
        },
      ];
      const res = transformComments(comments, ['informationUpdated']);
      expect(res).toEqual([
        {
          ...formatComment,
          comment: `${formatComment.comment} (updated at ${updateUser.updatedAt} by ${updateUser.updatedBy.full_name})`,
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
          updatedAt: '2020-04-13T08:34:53.450Z',
          updatedBy: { full_name: 'Elastic2', username: 'elastic' },
        },
      ];
      const res = transformComments(comments, ['informationAdded']);
      expect(res).toEqual([
        {
          ...formatComment,
          comment: `${formatComment.comment} (added at ${comments[0].updatedAt} by ${comments[0].updatedBy.full_name})`,
        },
      ]);
    });

    test('adds update user with empty fullname correctly', () => {
      const comments = [
        {
          ...commentObj,
          updatedAt: '2020-04-13T08:34:53.450Z',
          updatedBy: { full_name: '', username: 'elastic2' },
        },
      ];
      const res = transformComments(comments, ['informationAdded']);
      expect(res).toEqual([
        {
          ...formatComment,
          comment: `${formatComment.comment} (added at ${comments[0].updatedAt} by ${comments[0].updatedBy.username})`,
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
    const theCase = flattenCaseSavedObject({
      savedObject: mockCases[0],
    });

    it('maps an external incident', async () => {
      const res = await createIncident({
        actionsClient: actionsMock,
        theCase,
        userActions: [],
        connector: {
          id: '456',
          actionTypeId: '.jira',
          name: 'Connector without isCaseOwned',
          config: {
            apiUrl: 'https://elastic.jira.com',
          },
          isPreconfigured: false,
        },
        mappings: [],
        alerts: [],
      });

      expect(res).toEqual({
        incident: {
          description: 'a description (created at 2020-03-13T08:34:53.450Z by Elastic User)',
          externalId: null,
          impact: '3',
          severity: '1',
          short_description: 'a title (created at 2020-03-13T08:34:53.450Z by Elastic User)',
          urgency: '2',
        },
        comments: [
          {
            comment: 'first comment (added at 2020-03-13T08:34:53.450Z by Elastic User)',
            commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
          },
        ],
      });
    });

    it('throws error if invalid service', async () => {
      await createIncident({
        actionsClient: actionsMock,
        theCase,
        userActions: [],
        connector: {
          id: '456',
          actionTypeId: '.jira',
          name: 'Connector without isCaseOwned',
          config: {
            apiUrl: 'https://elastic.jira.com',
          },
          isPreconfigured: false,
        },
        mappings: [],
        alerts: [],
      }).catch((e) => {
        expect(e).not.toBeNull();
        expect(e).toEqual(new Error(`Invalid service`));
      });
    });

    it('updates an existing incident', async () => {
      const existingIncidentData = {
        description: 'fun description',
        impact: '3',
        severity: '3',
        short_description: 'fun title',
        urgency: '3',
      };

      const execute = jest.fn().mockReturnValue(existingIncidentData);
      actionsMock = { ...actionsMock, execute };

      const res = await createIncident({
        actionsClient: actionsMock,
        theCase,
        userActions: [],
        connector: {
          id: '456',
          actionTypeId: '.jira',
          name: 'Connector without isCaseOwned',
          config: {
            apiUrl: 'https://elastic.jira.com',
          },
          isPreconfigured: false,
        },
        mappings: [],
        alerts: [],
      });

      expect(res).toEqual({
        incident: {
          description: 'a description (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
          externalId: '123',
          impact: '3',
          severity: '1',
          short_description: 'a title (updated at 2020-03-13T08:34:53.450Z by Elastic User)',
          urgency: '2',
        },
        comments: [
          {
            comment: 'first comment (added at 2020-03-13T08:34:53.450Z by Elastic User)',
            commentId: 'b5b4c4d0-574e-11ea-9e2e-21b90f8a9631',
          },
        ],
      });
    });

    it('throws error when existing incident throws', async () => {
      const execute = jest.fn().mockImplementation(() => {
        throw new Error('exception');
      });

      actionsMock = { ...actionsMock, execute };
      await createIncident({
        actionsClient: actionsMock,
        theCase,
        userActions: [],
        connector: {
          id: '456',
          actionTypeId: '.jira',
          name: 'Connector without isCaseOwned',
          config: {
            apiUrl: 'https://elastic.jira.com',
          },
          isPreconfigured: false,
        },
        mappings: [],
        alerts: [],
      }).catch((e) => {
        expect(e).not.toBeNull();
        expect(e).toEqual(
          new Error(
            `Retrieving Incident by id 123 from ServiceNow failed with exception: Error: exception`
          )
        );
      });
    });
  });
});
