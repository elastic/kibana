/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsClientMock } from '../../../../actions/server/actions_client.mock';
import { mockCases } from '../../routes/api/__fixtures__';

import { BasicParams, ExternalServiceParams, Incident } from './types';
import {
  comment as commentObj,
  mappings,
  defaultPipes,
  basicParams,
  userActions,
  commentAlert,
  commentAlertMultipleIds,
  commentGeneratedAlert,
} from './mock';

import {
  createIncident,
  getLatestPushInfo,
  prepareFieldsForTransformation,
  transformComments,
  transformers,
  transformFields,
} from './utils';
import { flattenCaseSavedObject } from '../../common';
import { SECURITY_SOLUTION_OWNER } from '../../../common';
import { casesConnectors } from '../../connectors';

const formatComment = {
  commentId: commentObj.id,
  comment: 'Wow, good luck catching that bad meanie!',
};

const params = { ...basicParams };
const caseUrl = `https://elastic.co/app/security/cases/1234`;
const transformFieldsArgs = {
  params,
  caseUrl,
};

describe('utils', () => {
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
          pipes: [],
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
          pipes: [],
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
        ...transformFieldsArgs,
        fields,
      });

      expect(res).toEqual({
        short_description: 'a title',
        description: `a description [(created at 2020-03-13T08:34:53.450Z by Elastic User)](${caseUrl} )`,
      });
    });

    test('transform fields for update correctly', () => {
      const fields = prepareFieldsForTransformation({
        params,
        mappings,
        defaultPipes: ['informationUpdated'],
      });

      const res = transformFields<BasicParams, ExternalServiceParams, Incident>({
        ...transformFieldsArgs,
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
          short_description: 'first title',
          description: `first description [(created at 2020-03-13T08:34:53.450Z by Elastic User)](${caseUrl} )`,
        },
      });

      expect(res).toEqual({
        short_description: 'a title',
        description: `first description [(created at 2020-03-13T08:34:53.450Z by Elastic User)](${caseUrl} ) \r\na description [(updated at 2020-03-15T08:34:53.450Z by Another User)](${caseUrl} )`,
        // description: `first description [(created at 2020-03-13T08:34:53.450Z by Elastic User) \r\na description (updated at 2020-03-15T08:34:53.450Z by Another User)](${caseUrl} )`,
      });
    });

    test('add newline character to description', () => {
      const fields = prepareFieldsForTransformation({
        params,
        mappings,
        defaultPipes: ['informationUpdated'],
      });

      const res = transformFields<BasicParams, ExternalServiceParams, Incident>({
        ...transformFieldsArgs,
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
        ...transformFieldsArgs,
        params: {
          ...params,
          createdBy: { full_name: '', username: 'elastic', email: 'elastic@elastic.co' },
        },
        fields,
      });

      expect(res).toEqual({
        short_description: 'a title',
        description: `a description [(created at 2020-03-13T08:34:53.450Z by elastic)](${caseUrl} )`,
      });
    });

    test('append username if fullname is undefined when update', () => {
      const fields = prepareFieldsForTransformation({
        defaultPipes: ['informationUpdated'],
        mappings,
        params,
      });

      const res = transformFields<BasicParams, ExternalServiceParams, Incident>({
        ...transformFieldsArgs,
        params: {
          ...params,
          updatedAt: '2020-03-15T08:34:53.450Z',
          updatedBy: { username: 'anotherUser', full_name: '', email: 'elastic@elastic.co' },
        },
        fields,
      });

      expect(res).toEqual({
        short_description: 'a title',
        description: `a description [(updated at 2020-03-15T08:34:53.450Z by anotherUser)](${caseUrl} )`,
      });
    });
  });

  describe('transformComments', () => {
    test('transform creation comments', () => {
      const comments = [commentObj];
      const res = transformComments(comments, ['informationCreated'], caseUrl);
      expect(res).toEqual([
        {
          ...formatComment,
          comment: `${formatComment.comment} [(created at ${comments[0].created_at} by ${comments[0].created_by.full_name})](${caseUrl}/${commentObj.id} )`,
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
      const res = transformComments(comments, ['informationUpdated'], caseUrl);
      expect(res).toEqual([
        {
          ...formatComment,
          comment: `${formatComment.comment} [(updated at ${comments[0].updated_at} by ${comments[0].updated_by.full_name})](${caseUrl}/${commentObj.id} )`,
        },
      ]);
    });

    test('transform added comments', () => {
      const comments = [commentObj];
      const res = transformComments(comments, ['informationAdded'], caseUrl);
      expect(res).toEqual([
        {
          ...formatComment,
          comment: `${formatComment.comment} [(added at ${comments[0].created_at} by ${comments[0].created_by.full_name})](${caseUrl}/${commentObj.id} )`,
        },
      ]);
    });

    test('transform comments without fullname', () => {
      const comments = [{ ...commentObj, createdBy: { username: commentObj.created_by.username } }];
      // @ts-ignore testing no full_name
      const res = transformComments(comments, ['informationAdded'], caseUrl);
      expect(res).toEqual([
        {
          ...formatComment,
          comment: `${formatComment.comment} [(added at ${comments[0].created_at} by ${comments[0].created_by.username})](${caseUrl}/${commentObj.id} )`,
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
      const res = transformComments(comments, ['informationAdded'], caseUrl);
      expect(res).toEqual([
        {
          ...formatComment,
          comment: `${formatComment.comment} [(added at ${comments[0].updated_at} by ${comments[0].updated_by.full_name})](${caseUrl}/${commentObj.id} )`,
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
      const res = transformComments(comments, ['informationAdded'], caseUrl);
      expect(res).toEqual([
        {
          ...formatComment,
          comment: `${formatComment.comment} [(added at ${comments[0].updated_at} by ${comments[0].updated_by.username})](${caseUrl}/${commentObj.id} )`,
        },
      ]);
    });
  });

  describe('transformers', () => {
    const baseArgs = {
      caseUrl,
      value: 'a value',
    };
    const { informationCreated, informationUpdated, informationAdded, append } = transformers;
    describe('informationCreated', () => {
      test('transforms correctly', () => {
        const res = informationCreated({
          ...baseArgs,
          date: '2020-04-15T08:19:27.400Z',
          user: 'elastic',
        });
        expect(res).toEqual({
          value: `a value [(created at 2020-04-15T08:19:27.400Z by elastic)](${caseUrl} )`,
        });
      });

      test('transforms correctly without optional fields', () => {
        const res = informationCreated(baseArgs);
        expect(res).toEqual({ value: `a value [(created at  by )](${caseUrl} )` });
      });

      test('returns correctly rest fields', () => {
        const res = informationCreated({
          ...baseArgs,
          date: '2020-04-15T08:19:27.400Z',
          user: 'elastic',
          previousValue: 'previous value',
        });
        expect(res).toEqual({
          value: `a value [(created at 2020-04-15T08:19:27.400Z by elastic)](${caseUrl} )`,
          previousValue: 'previous value',
        });
      });
    });

    describe('informationUpdated', () => {
      test('transforms correctly', () => {
        const res = informationUpdated({
          ...baseArgs,
          date: '2020-04-15T08:19:27.400Z',
          user: 'elastic',
        });
        expect(res).toEqual({
          value: `a value [(updated at 2020-04-15T08:19:27.400Z by elastic)](${caseUrl} )`,
        });
      });

      test('transforms correctly without optional fields', () => {
        const res = informationUpdated(baseArgs);
        expect(res).toEqual({ value: `a value [(updated at  by )](${caseUrl} )` });
      });

      test('returns correctly rest fields', () => {
        const res = informationUpdated({
          ...baseArgs,
          date: '2020-04-15T08:19:27.400Z',
          user: 'elastic',
          previousValue: 'previous value',
        });
        expect(res).toEqual({
          value: `a value [(updated at 2020-04-15T08:19:27.400Z by elastic)](${caseUrl} )`,
          previousValue: 'previous value',
        });
      });
    });

    describe('informationAdded', () => {
      test('transforms correctly', () => {
        const res = informationAdded({
          ...baseArgs,
          date: '2020-04-15T08:19:27.400Z',
          user: 'elastic',
        });
        expect(res).toEqual({
          value: `a value [(added at 2020-04-15T08:19:27.400Z by elastic)](${caseUrl} )`,
        });
      });

      test('transforms correctly without optional fields', () => {
        const res = informationAdded(baseArgs);
        expect(res).toEqual({ value: `a value [(added at  by )](${caseUrl} )` });
      });

      test('returns correctly rest fields', () => {
        const res = informationAdded({
          ...baseArgs,
          date: '2020-04-15T08:19:27.400Z',
          user: 'elastic',
          previousValue: 'previous value',
        });
        expect(res).toEqual({
          value: `a value [(added at 2020-04-15T08:19:27.400Z by elastic)](${caseUrl} )`,
          previousValue: 'previous value',
        });
      });
    });

    describe('append', () => {
      test('transforms correctly', () => {
        const res = append({
          ...baseArgs,
          previousValue: `This is a brand new case of a bad meanie defacing data [(created at 2019-11-25T21:54:48.952Z by elastic)](${caseUrl} )`,
        });
        expect(res).toEqual({
          value: `This is a brand new case of a bad meanie defacing data [(created at 2019-11-25T21:54:48.952Z by elastic)](${caseUrl} ) \r\na value`,
        });
      });

      test('transforms correctly without optional fields', () => {
        const res = append(baseArgs);
        expect(res).toEqual({ value: 'a value' });
      });

      test('returns correctly rest fields', () => {
        const res = append({
          ...baseArgs,
          user: 'elastic',
          previousValue: `This is a brand new case of a bad meanie defacing data [(created at 2019-11-25T21:54:48.952Z by elastic)](${caseUrl} )`,
        });
        expect(res).toEqual({
          value: `This is a brand new case of a bad meanie defacing data [(created at 2019-11-25T21:54:48.952Z by elastic)](${caseUrl} ) \r\na value`,
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
    const basicCreateIncidentArgs = {
      actionsClient: actionsMock,
      alerts: [],
      casesConnectors,
      caseUrl,
      connector,
      mappings,
      theCase,
      userActions,
    };

    it('creates an external incident', async () => {
      const res = await createIncident({ ...basicCreateIncidentArgs, userActions: [] });

      expect(res).toEqual({
        incident: {
          priority: null,
          labels: ['defacement'],
          issueType: null,
          parent: null,
          short_description: 'Super Bad Security Issue',
          description: `This is a brand new case of a bad meanie defacing data [(created at 2019-11-25T21:54:48.952Z by elastic)](${caseUrl} )`,
          externalId: null,
        },
        comments: [],
      });
    });

    it('it creates comments correctly', async () => {
      const res = await createIncident({
        ...basicCreateIncidentArgs,
        theCase: {
          ...theCase,
          comments: [{ ...commentObj, id: 'comment-user-1' }],
        },
      });

      expect(res.comments).toEqual([
        {
          comment: `Wow, good luck catching that bad meanie! [(added at 2019-11-25T21:55:00.177Z by elastic)](${caseUrl}/comment-user-1 )`,
          commentId: 'comment-user-1',
        },
      ]);
    });

    it('it does NOT creates comments when mapping is nothing', async () => {
      const res = await createIncident({
        ...basicCreateIncidentArgs,
        mappings: [
          mappings[0],
          mappings[1],
          {
            source: 'comments',
            target: 'comments',
            action_type: 'nothing',
          },
        ],
        theCase: {
          ...theCase,
          comments: [{ ...commentObj, id: 'comment-user-1' }],
        },
      });

      expect(res.comments).toEqual([]);
    });

    it('it adds the total alert comments correctly', async () => {
      const res = await createIncident({
        ...basicCreateIncidentArgs,
        theCase: {
          ...theCase,
          comments: [
            { ...commentObj, id: 'comment-user-1' },
            { ...commentAlert, id: 'comment-alert-1' },
            {
              ...commentAlertMultipleIds,
            },
          ],
        },
        // Remove second push
        userActions: userActions.filter((item, index) => index !== 4),
        mappings: [
          ...mappings,
          {
            source: 'comments',
            target: 'comments',
            action_type: 'nothing',
          },
        ],
      });

      expect(res.comments).toEqual([
        {
          comment: `Wow, good luck catching that bad meanie! [(added at 2019-11-25T21:55:00.177Z by elastic)](${caseUrl}/comment-user-1 )`,
          commentId: 'comment-user-1',
        },
        {
          comment: 'Elastic Alerts attached to the case: 3',
          commentId: 'mock-id-1-total-alerts',
        },
      ]);
    });

    it('it removes alerts correctly', async () => {
      const res = await createIncident({
        ...basicCreateIncidentArgs,
        theCase: {
          ...theCase,
          comments: [
            { ...commentObj, id: 'comment-user-1' },
            commentAlertMultipleIds,
            commentGeneratedAlert,
          ],
        },
      });

      expect(res.comments).toEqual([
        {
          comment: `Wow, good luck catching that bad meanie! [(added at 2019-11-25T21:55:00.177Z by elastic)](${caseUrl}/comment-user-1 )`,
          commentId: 'comment-user-1',
        },
        {
          comment: 'Elastic Alerts attached to the case: 4',
          commentId: 'mock-id-1-total-alerts',
        },
      ]);
    });

    it('updates an existing incident', async () => {
      const existingIncidentData = {
        priority: null,
        issueType: null,
        parent: null,
        short_description: 'fun title',
        description: `fun description [(created at 2019-11-25T21:55:00.177Z by elastic)](${caseUrl} )`,
      };

      const execute = jest.fn().mockReturnValue(existingIncidentData);
      actionsMock = { ...actionsMock, execute };

      const res = await createIncident({ ...basicCreateIncidentArgs, actionsClient: actionsMock });

      expect(res).toEqual({
        incident: {
          priority: null,
          labels: ['defacement'],
          issueType: null,
          parent: null,
          description: `fun description [(created at 2019-11-25T21:55:00.177Z by elastic)](${caseUrl} ) \r\nThis is a brand new case of a bad meanie defacing data [(updated at 2019-11-25T21:54:48.952Z by elastic)](${caseUrl} )`,
          externalId: 'external-id',
          short_description: 'Super Bad Security Issue',
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
      createIncident({ ...basicCreateIncidentArgs, actionsClient: actionsMock }).catch((e) => {
        expect(e).not.toBeNull();
        expect(e).toEqual(
          new Error(
            `Retrieving Incident by id external-id from .jira failed with exception: Error: exception`
          )
        );
      });
    });

    it('throws error if connector is not supported', async () => {
      createIncident({
        ...basicCreateIncidentArgs,
        connector: { ...connector, actionTypeId: 'not-supported' },
      }).catch((e) => {
        expect.assertions(2);
        expect(e).not.toBeNull();
        expect(e).toEqual(new Error('Invalid external service'));
      });
    });

    describe('getLatestPushInfo', () => {
      it('it returns the latest push information correctly', async () => {
        const res = getLatestPushInfo('456', userActions);
        expect(res).toEqual({
          index: 4,
          pushedInfo: {
            connector_id: '456',
            connector_name: 'ServiceNow SN',
            external_id: 'external-id',
            external_title: 'SIR0010037',
            external_url:
              'https://dev92273.service-now.com/nav_to.do?uri=sn_si_incident.do?sys_id=external-id',
            pushed_at: '2021-02-03T17:45:29.400Z',
            pushed_by: {
              email: 'elastic@elastic.co',
              full_name: 'Elastic',
              username: 'elastic',
            },
          },
        });
      });

      it('it returns null when there are not actions', async () => {
        const res = getLatestPushInfo('456', []);
        expect(res).toBe(null);
      });

      it('it returns null when there are no push user action', async () => {
        const res = getLatestPushInfo('456', [userActions[0]]);
        expect(res).toBe(null);
      });

      it('it returns the correct push information when with multiple push on different connectors', async () => {
        const res = getLatestPushInfo('456', [
          ...userActions.slice(0, 3),
          {
            action_field: ['pushed'],
            action: 'push-to-service',
            action_at: '2021-02-03T17:45:29.400Z',
            action_by: {
              email: 'elastic@elastic.co',
              full_name: 'Elastic',
              username: 'elastic',
            },
            new_value:
              // The connector id is  123
              '{"pushed_at":"2021-02-03T17:45:29.400Z","pushed_by":{"username":"elastic","full_name":"Elastic","email":"elastic@elastic.co"},"connector_id":"123","connector_name":"ServiceNow SN","external_id":"external-id","external_title":"SIR0010037","external_url":"https://dev92273.service-now.com/nav_to.do?uri=sn_si_incident.do?sys_id=external-id"}',
            old_value: null,
            action_id: '9b91d8f0-6647-11eb-a291-51bf6b175a53',
            case_id: 'fcdedd20-6646-11eb-a291-51bf6b175a53',
            comment_id: null,
            owner: SECURITY_SOLUTION_OWNER,
          },
        ]);

        expect(res).toEqual({
          index: 1,
          pushedInfo: {
            connector_id: '456',
            connector_name: 'ServiceNow SN',
            external_id: 'external-id',
            external_title: 'SIR0010037',
            external_url:
              'https://dev92273.service-now.com/nav_to.do?uri=sn_si_incident.do?sys_id=external-id',
            pushed_at: '2021-02-03T17:41:26.108Z',
            pushed_by: {
              email: 'elastic@elastic.co',
              full_name: 'Elastic',
              username: 'elastic',
            },
          },
        });
      });
    });
  });
});
