/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client.mock';
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
  isolateCommentActions,
  releaseCommentActions,
  isolateCommentActionsMultipleTargets,
} from './mock';

import {
  createIncident,
  dedupAssignees,
  getClosedInfoForUpdate,
  getDurationForUpdate,
  getEntity,
  getLatestPushInfo,
  prepareFieldsForTransformation,
  transformComments,
  transformers,
  transformFields,
} from './utils';
import { Actions, CaseStatuses } from '../../../common/api';
import { flattenCaseSavedObject } from '../../common/utils';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { casesConnectors } from '../../connectors';
import { userProfiles, userProfilesMap } from '../user_profiles.mock';

const formatComment = {
  commentId: commentObj.id,
  comment: 'Wow, good luck catching that bad meanie!',
};

const formatIsolateActionComment = {
  commentId: isolateCommentActions.id,
  comment: 'Isolating this for investigation',
  actions: {
    targets: [
      {
        hostname: 'windows-host-1',
        endpointId: '123',
      },
    ],
    type: 'isolate',
  },
};

const formatReleaseActionComment = {
  commentId: releaseCommentActions.id,
  comment: 'Releasing this for investigation',
  actions: {
    targets: [
      {
        hostname: 'windows-host-1',
        endpointId: '123',
      },
    ],
    type: 'unisolate',
  },
};

const formatIsolateCommentActionsMultipleTargets = {
  commentId: isolateCommentActionsMultipleTargets.id,
  comment: 'Isolating this for investigation',
  actions: {
    targets: [
      {
        hostname: 'windows-host-1',
        endpointId: '123',
      },
      {
        hostname: 'windows-host-2',
        endpointId: '456',
      },
    ],
    type: 'isolate',
  },
};

const params = { ...basicParams };

describe('utils', () => {
  describe('dedupAssignees', () => {
    it('removes duplicate assignees', () => {
      expect(dedupAssignees([{ uid: '123' }, { uid: '123' }, { uid: '456' }])).toEqual([
        { uid: '123' },
        { uid: '456' },
      ]);
    });

    it('leaves the array as it is when there are no duplicates', () => {
      expect(dedupAssignees([{ uid: '123' }, { uid: '456' }])).toEqual([
        { uid: '123' },
        { uid: '456' },
      ]);
    });

    it('returns undefined when the assignees is undefined', () => {
      expect(dedupAssignees()).toBeUndefined();
    });
  });

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
        params,
        fields,
      });

      expect(res).toEqual({
        short_description: 'a title',
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
          short_description: 'first title',
          description: 'first description (created at 2020-03-13T08:34:53.450Z by Elastic User)',
        },
      });

      expect(res).toEqual({
        short_description: 'a title',
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
        short_description: 'a title',
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
        short_description: 'a title',
        description: 'a description (updated at 2020-03-15T08:34:53.450Z by anotherUser)',
      });
    });
  });

  describe('transformComments', () => {
    test('transform creation comments', () => {
      const comments = [commentObj];
      const res = transformComments(comments, ['informationCreated'], new Map());
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
      const res = transformComments(comments, ['informationUpdated'], new Map());
      expect(res).toEqual([
        {
          ...formatComment,
          comment: `${formatComment.comment} (updated at ${comments[0].updated_at} by ${comments[0].updated_by.full_name})`,
        },
      ]);
    });

    test('transform added comments', () => {
      const comments = [commentObj];
      const res = transformComments(comments, ['informationAdded'], new Map());
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
      const res = transformComments(comments, ['informationAdded'], new Map());
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
      const res = transformComments(comments, ['informationAdded'], new Map());
      expect(res).toEqual([
        {
          ...formatComment,
          comment: `${formatComment.comment} (added at ${comments[0].updated_at} by ${comments[0].updated_by.username})`,
        },
      ]);
    });

    test('transform isolate action comment', () => {
      const comments = [isolateCommentActions];
      const res = transformComments(comments, ['informationCreated'], new Map());
      const actionText = `Isolated host ${formatIsolateActionComment.actions.targets[0].hostname} with comment: ${formatIsolateActionComment.comment}`;
      expect(res).toEqual([
        {
          commentId: formatIsolateActionComment.commentId,
          comment: `${actionText} (created at ${comments[0].created_at} by ${comments[0].created_by.full_name})`,
        },
      ]);
    });

    test('transform release action comment', () => {
      const comments = [releaseCommentActions];
      const res = transformComments(comments, ['informationCreated'], new Map());
      const actionText = `Released host ${formatReleaseActionComment.actions.targets[0].hostname} with comment: ${formatReleaseActionComment.comment}`;
      expect(res).toEqual([
        {
          commentId: formatReleaseActionComment.commentId,
          comment: `${actionText} (created at ${comments[0].created_at} by ${comments[0].created_by.full_name})`,
        },
      ]);
    });

    test('transform isolate action comment with multiple hosts', () => {
      const comments = [isolateCommentActionsMultipleTargets];
      const res = transformComments(comments, ['informationCreated'], new Map());
      const actionText = `Isolated host ${formatIsolateCommentActionsMultipleTargets.actions.targets[0].hostname} and 1 more with comment: ${formatIsolateCommentActionsMultipleTargets.comment}`;
      expect(res).toEqual([
        {
          commentId: formatIsolateCommentActionsMultipleTargets.commentId,
          comment: `${actionText} (created at ${comments[0].created_at} by ${comments[0].created_by.full_name})`,
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
      isDeprecated: false,
    };

    it('creates an external incident', async () => {
      const res = await createIncident({
        actionsClient: actionsMock,
        theCase,
        userActions: [],
        connector,
        mappings,
        alerts: [],
        casesConnectors,
      });

      expect(res).toEqual({
        incident: {
          priority: null,
          labels: ['defacement'],
          issueType: null,
          parent: null,
          short_description: 'Super Bad Security Issue',
          description:
            'This is a brand new case of a bad meanie defacing data (created at 2019-11-25T21:54:48.952Z by elastic)',
          externalId: null,
        },
        comments: [],
      });
    });

    it('it creates comments correctly', async () => {
      const res = await createIncident({
        actionsClient: actionsMock,
        theCase: {
          ...theCase,
          comments: [{ ...commentObj, id: 'comment-user-1' }],
        },
        userActions,
        connector,
        mappings,
        alerts: [],
        casesConnectors,
      });

      expect(res.comments).toEqual([
        {
          comment:
            'Wow, good luck catching that bad meanie! (added at 2019-11-25T21:55:00.177Z by elastic)',
          commentId: 'comment-user-1',
        },
      ]);
    });

    it('it does NOT creates comments when mapping is nothing', async () => {
      const res = await createIncident({
        actionsClient: actionsMock,
        theCase: {
          ...theCase,
          comments: [{ ...commentObj, id: 'comment-user-1' }],
        },
        userActions,
        connector,
        mappings: [
          mappings[0],
          mappings[1],
          {
            source: 'comments',
            target: 'comments',
            action_type: 'nothing',
          },
        ],
        alerts: [],
        casesConnectors,
      });

      expect(res.comments).toEqual([]);
    });

    it('it adds the total alert comments correctly', async () => {
      const res = await createIncident({
        actionsClient: actionsMock,
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
        userActions,
        connector,
        mappings: [
          ...mappings,
          {
            source: 'comments',
            target: 'comments',
            action_type: 'nothing',
          },
        ],
        alerts: [],
        casesConnectors,
      });

      expect(res.comments).toEqual([
        {
          comment:
            'Wow, good luck catching that bad meanie! (added at 2019-11-25T21:55:00.177Z by elastic)',
          commentId: 'comment-user-1',
        },
        {
          comment: 'Elastic Alerts attached to the case: 3',
          commentId: 'mock-id-1-total-alerts',
        },
      ]);
    });

    it('it filters out the alerts from the comments correctly', async () => {
      const res = await createIncident({
        actionsClient: actionsMock,
        theCase: {
          ...theCase,
          comments: [{ ...commentObj, id: 'comment-user-1' }, commentAlertMultipleIds],
        },
        userActions,
        connector,
        mappings,
        alerts: [],
        casesConnectors,
      });

      expect(res.comments).toEqual([
        {
          comment:
            'Wow, good luck catching that bad meanie! (added at 2019-11-25T21:55:00.177Z by elastic)',
          commentId: 'comment-user-1',
        },
        {
          comment: 'Elastic Alerts attached to the case: 2',
          commentId: 'mock-id-1-total-alerts',
        },
      ]);
    });

    it('does not add the alerts count comment if all alerts have been pushed', async () => {
      const res = await createIncident({
        actionsClient: actionsMock,
        theCase: {
          ...theCase,
          comments: [
            { ...commentObj, id: 'comment-user-1', pushed_at: '2019-11-25T21:55:00.177Z' },
            { ...commentAlertMultipleIds, pushed_at: '2019-11-25T21:55:00.177Z' },
          ],
        },
        userActions,
        connector,
        mappings,
        alerts: [],
        casesConnectors,
      });

      expect(res.comments).toEqual([
        {
          comment:
            'Wow, good luck catching that bad meanie! (added at 2019-11-25T21:55:00.177Z by elastic)',
          commentId: 'comment-user-1',
        },
      ]);
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
        casesConnectors,
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
      createIncident({
        actionsClient: actionsMock,
        theCase,
        userActions,
        connector,
        mappings,
        alerts: [],
        casesConnectors,
      }).catch((e) => {
        expect(e).not.toBeNull();
        expect(e).toEqual(
          new Error(
            `Retrieving Incident by id external-id from .jira failed with exception: Error: exception`
          )
        );
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
            type: 'pushed',
            action: Actions.push_to_service,
            created_at: '2021-02-03T17:45:29.400Z',
            created_by: {
              email: 'elastic@elastic.co',
              full_name: 'Elastic',
              username: 'elastic',
            },
            payload: {
              externalService: {
                pushed_at: '2021-02-03T17:45:29.400Z',
                pushed_by: {
                  username: 'elastic',
                  full_name: 'Elastic',
                  email: 'elastic@elastic.co',
                },
                connector_id: '123',
                connector_name: 'ServiceNow SN',
                external_id: 'external-id',
                external_title: 'SIR0010037',
                external_url:
                  'https://dev92273.service-now.com/nav_to.do?uri=sn_si_incident.do?sys_id=external-id',
              },
            },
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

    describe('getClosedInfoForUpdate', () => {
      const date = '2021-02-03T17:41:26.108Z';
      const user = { full_name: 'Elastic', username: 'elastic', email: 'elastic@elastic.co' };

      it('returns the correct closed info when the case closes', async () => {
        expect(
          getClosedInfoForUpdate({ status: CaseStatuses.closed, closedDate: date, user })
        ).toEqual({
          closed_at: date,
          closed_by: user,
        });
      });

      it.each([[CaseStatuses.open], [CaseStatuses['in-progress']]])(
        'returns the correct closed info when the case %s',
        async (status) => {
          expect(getClosedInfoForUpdate({ status, closedDate: date, user })).toEqual({
            closed_at: null,
            closed_by: null,
          });
        }
      );

      it('returns undefined if the status is not provided', async () => {
        expect(getClosedInfoForUpdate({ closedDate: date, user })).toBe(undefined);
      });
    });

    describe('getDurationForUpdate', () => {
      const createdAt = '2021-11-23T19:00:00Z';
      const closedAt = '2021-11-23T19:02:00Z';

      it('returns the correct duration when the case closes', () => {
        expect(getDurationForUpdate({ status: CaseStatuses.closed, closedAt, createdAt })).toEqual({
          duration: 120,
        });
      });

      it.each([[CaseStatuses.open], [CaseStatuses['in-progress']]])(
        'returns the correct duration when the case %s',
        (status) => {
          expect(getDurationForUpdate({ status, closedAt, createdAt })).toEqual({
            duration: null,
          });
        }
      );

      it('returns undefined if the status is not provided', async () => {
        expect(getDurationForUpdate({ closedAt, createdAt })).toBe(undefined);
      });

      it.each([['invalid'], [null]])(
        'returns undefined if the createdAt date is %s',
        (createdAtInvalid) => {
          expect(
            getDurationForUpdate({
              status: CaseStatuses.closed,
              closedAt,
              // @ts-expect-error
              createdAt: createdAtInvalid,
            })
          ).toBe(undefined);
        }
      );

      it.each([['invalid'], [null]])(
        'returns undefined if the closedAt date is %s',
        (closedAtInvalid) => {
          expect(
            getDurationForUpdate({
              status: CaseStatuses.closed,
              // @ts-expect-error
              closedAt: closedAtInvalid,
              createdAt,
            })
          ).toBe(undefined);
        }
      );

      it('returns undefined if created_at > closed_at', async () => {
        expect(
          getDurationForUpdate({
            status: CaseStatuses.closed,
            closedAt: '2021-11-23T19:00:00Z',
            createdAt: '2021-11-23T19:05:00Z',
          })
        ).toBe(undefined);
      });

      it('rounds the seconds correctly', () => {
        expect(
          getDurationForUpdate({
            status: CaseStatuses.closed,
            createdAt: '2022-04-11T15:56:00.087Z',
            closedAt: '2022-04-11T15:58:56.187Z',
          })
        ).toEqual({
          duration: 176,
        });
      });

      it('rounds the zero correctly', () => {
        expect(
          getDurationForUpdate({
            status: CaseStatuses.closed,
            createdAt: '2022-04-11T15:56:00.087Z',
            closedAt: '2022-04-11T15:56:00.187Z',
          })
        ).toEqual({
          duration: 0,
        });
      });
    });
  });

  describe('getEntity', () => {
    const userProfilesMapNoFullNames = new Map(
      Array.from(userProfilesMap.entries()).map((profileTuple) => [
        profileTuple[0],
        { ...profileTuple[1], user: { ...profileTuple[1].user, full_name: undefined } },
      ])
    );

    it('returns the username when full name is empty for updatedBy', () => {
      expect(
        getEntity({
          createdAt: '',
          createdBy: { email: null, full_name: null, username: null },
          updatedAt: '',
          updatedBy: { email: null, full_name: '', username: 'updatedBy_username' },
        })
      ).toEqual('updatedBy_username');
    });

    it('returns the username when full name is empty for createdBy', () => {
      expect(
        getEntity({
          createdAt: '',
          createdBy: { email: null, full_name: '', username: 'createdBy_username' },
          updatedAt: '',
          updatedBy: null,
        })
      ).toEqual('createdBy_username');
    });

    it('returns an empty string with neither updatedBy or createdBy are defined', () => {
      expect(
        getEntity({
          createdAt: '',
          // @ts-expect-error createdBy should be defined but for testing purposes we want to make sure the function handles null
          createdBy: null,
          updatedAt: '',
          updatedBy: null,
        })
      ).toEqual('');
    });

    it('returns an empty string when createdBy fields are all null', () => {
      expect(
        getEntity({
          createdAt: '',
          createdBy: { email: null, full_name: null, username: null },
          updatedAt: '',
          updatedBy: null,
        })
      ).toEqual('');
    });

    it('returns the full name of updatedBy when available', () => {
      expect(
        getEntity({
          createdAt: '',
          createdBy: { email: null, full_name: 'createdBy_full_name', username: null },
          updatedAt: '',
          updatedBy: { full_name: 'updatedBy_full_name', email: null, username: null },
        })
      ).toEqual('updatedBy_full_name');
    });

    it('returns the username of updatedBy when available', () => {
      expect(
        getEntity({
          createdAt: '',
          createdBy: { email: null, full_name: null, username: 'createdBy_username' },
          updatedAt: '',
          updatedBy: { full_name: null, email: null, username: 'updatedBy_username' },
        })
      ).toEqual('updatedBy_username');
    });

    it('returns an empty string when updatedBy username is null', () => {
      expect(
        getEntity({
          createdAt: '',
          createdBy: { email: null, full_name: null, username: 'createdBy_username' },
          updatedAt: '',
          updatedBy: { full_name: null, email: null, username: null },
        })
      ).toEqual('');
    });

    it('returns the full name of createdBy when available', () => {
      expect(
        getEntity({
          createdAt: '',
          createdBy: {
            email: null,
            full_name: 'createdBy_full_name',
            username: 'createdBy_username',
          },
          updatedAt: '',
          updatedBy: null,
        })
      ).toEqual('createdBy_full_name');
    });

    it('returns the username of createdBy when available', () => {
      expect(
        getEntity({
          createdAt: '',
          createdBy: { email: null, full_name: null, username: 'createdBy_username' },
          updatedAt: '',
          updatedBy: null,
        })
      ).toEqual('createdBy_username');
    });

    it('returns updatedBy full name when the profile uid is not found', () => {
      expect(
        getEntity({
          createdAt: '',
          createdBy: { email: null, full_name: null, username: 'createdBy_username' },
          updatedAt: '',
          updatedBy: {
            email: null,
            full_name: 'updatedBy_full_name',
            username: 'createdBy_username',
            profile_uid: '123',
          },
        })
      ).toEqual('updatedBy_full_name');
    });

    it('returns createdBy full name when the profile uid is not found', () => {
      expect(
        getEntity({
          createdAt: '',
          createdBy: {
            email: null,
            full_name: 'createdBy_full_name',
            username: 'createdBy_username',
            profile_uid: '123',
          },
          updatedAt: '',
          updatedBy: null,
        })
      ).toEqual('createdBy_full_name');
    });

    it('returns updatedBy profile full name when the profile is found', () => {
      expect(
        getEntity(
          {
            createdAt: '',
            createdBy: {
              email: null,
              full_name: null,
              username: null,
            },
            updatedAt: '',
            updatedBy: {
              email: null,
              full_name: null,
              username: null,
              profile_uid: userProfiles[0].uid,
            },
          },
          userProfilesMap
        )
      ).toEqual(userProfiles[0].user.full_name);
    });

    it('returns updatedBy profile username when the profile is found', () => {
      expect(
        getEntity(
          {
            createdAt: '',
            createdBy: {
              email: null,
              full_name: null,
              username: null,
            },
            updatedAt: '',
            updatedBy: {
              email: null,
              full_name: null,
              username: null,
              profile_uid: userProfiles[0].uid,
            },
          },
          userProfilesMapNoFullNames
        )
      ).toEqual(userProfiles[0].user.username);
    });

    it('returns createdBy profile full name when the profile is found', () => {
      expect(
        getEntity(
          {
            createdAt: '',
            createdBy: {
              email: null,
              full_name: null,
              username: null,
              profile_uid: userProfiles[0].uid,
            },
            updatedAt: '',
            updatedBy: null,
          },
          userProfilesMap
        )
      ).toEqual(userProfiles[0].user.full_name);
    });

    it('returns createdBy profile username when the profile is found', () => {
      expect(
        getEntity(
          {
            updatedAt: '',
            updatedBy: null,
            createdAt: '',
            createdBy: {
              email: null,
              full_name: null,
              username: null,
              profile_uid: userProfiles[0].uid,
            },
          },
          userProfilesMapNoFullNames
        )
      ).toEqual(userProfiles[0].user.username);
    });
  });
});
