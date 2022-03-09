/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import {
  getPushedInfo,
  initialData,
  useGetCaseUserActions,
  UseGetCaseUserActions,
} from './use_get_case_user_actions';
import {
  basicCase,
  basicPush,
  caseUserActions,
  elasticUser,
  getJiraConnector,
  getUserAction,
  jiraFields,
} from './mock';
import * as api from './api';
import { Actions } from '../../common/api';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('useGetCaseUserActions', () => {
  const abortCtrl = new AbortController();
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCaseUserActions>(() =>
        useGetCaseUserActions(basicCase.id, basicCase.connector.id)
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        ...initialData,
        fetchCaseUserActions: result.current.fetchCaseUserActions,
      });
    });
  });

  it('calls getCaseUserActions with correct arguments', async () => {
    const spyOnPostCase = jest.spyOn(api, 'getCaseUserActions');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCaseUserActions>(() =>
        useGetCaseUserActions(basicCase.id, basicCase.connector.id)
      );
      await waitForNextUpdate();

      result.current.fetchCaseUserActions(basicCase.id, basicCase.connector.id);
      await waitForNextUpdate();
      expect(spyOnPostCase).toBeCalledWith(basicCase.id, abortCtrl.signal);
    });
  });

  it('returns proper state on getCaseUserActions', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCaseUserActions>(() =>
        useGetCaseUserActions(basicCase.id, basicCase.connector.id)
      );
      await waitForNextUpdate();
      result.current.fetchCaseUserActions(basicCase.id, basicCase.connector.id);
      await waitForNextUpdate();
      expect(result.current).toEqual({
        ...initialData,
        caseUserActions,
        fetchCaseUserActions: result.current.fetchCaseUserActions,
        hasDataToPush: true,
        isError: false,
        isLoading: false,
        participants: [elasticUser],
      });
    });
  });

  it('set isLoading to true when posting case', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCaseUserActions>(() =>
        useGetCaseUserActions(basicCase.id, basicCase.connector.id)
      );
      await waitForNextUpdate();
      result.current.fetchCaseUserActions(basicCase.id, basicCase.connector.id);

      expect(result.current.isLoading).toBe(true);
    });
  });

  it('unhappy path', async () => {
    const spyOnPostCase = jest.spyOn(api, 'getCaseUserActions');
    spyOnPostCase.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCaseUserActions>(() =>
        useGetCaseUserActions(basicCase.id, basicCase.connector.id)
      );
      await waitForNextUpdate();
      result.current.fetchCaseUserActions(basicCase.id, basicCase.connector.id);

      expect(result.current).toEqual({
        ...initialData,
        isLoading: false,
        isError: true,
        fetchCaseUserActions: result.current.fetchCaseUserActions,
      });
    });
  });

  describe('getPushedInfo', () => {
    it('Correctly marks first/last index - hasDataToPush: false', () => {
      const userActions = [...caseUserActions, getUserAction('pushed', Actions.push_to_service)];
      const result = getPushedInfo(userActions, '123');
      expect(result).toEqual({
        hasDataToPush: false,
        caseServices: {
          '123': {
            ...basicPush,
            firstPushIndex: 3,
            lastPushIndex: 3,
            commentsToUpdate: [],
            hasDataToPush: false,
          },
        },
      });
    });

    it('Correctly marks first/last index and comment id - hasDataToPush: true', () => {
      const userActions = [
        ...caseUserActions,
        getUserAction('pushed', Actions.push_to_service),
        getUserAction('comment', Actions.create),
      ];
      const result = getPushedInfo(userActions, '123');
      expect(result).toEqual({
        hasDataToPush: true,
        caseServices: {
          '123': {
            ...basicPush,
            firstPushIndex: 3,
            lastPushIndex: 3,
            commentsToUpdate: [userActions[userActions.length - 1].commentId],
            hasDataToPush: true,
          },
        },
      });
    });

    it('Correctly marks first/last index and multiple comment ids, both needs push', () => {
      const userActions = [
        ...caseUserActions,
        getUserAction('pushed', Actions.push_to_service),
        getUserAction('comment', Actions.create),
        { ...getUserAction('comment', Actions.create), commentId: 'muahaha' },
      ];
      const result = getPushedInfo(userActions, '123');
      expect(result).toEqual({
        hasDataToPush: true,
        caseServices: {
          '123': {
            ...basicPush,
            firstPushIndex: 3,
            lastPushIndex: 3,
            commentsToUpdate: [
              userActions[userActions.length - 2].commentId,
              userActions[userActions.length - 1].commentId,
            ],
            hasDataToPush: true,
          },
        },
      });
    });

    it('Correctly marks first/last index and multiple comment ids, one needs push', () => {
      const userActions = [
        ...caseUserActions,
        getUserAction('pushed', Actions.push_to_service),
        getUserAction('comment', Actions.create),
        getUserAction('pushed', Actions.push_to_service),
        { ...getUserAction('comment', Actions.create), commentId: 'muahaha' },
      ];
      const result = getPushedInfo(userActions, '123');
      expect(result).toEqual({
        hasDataToPush: true,
        caseServices: {
          '123': {
            ...basicPush,
            firstPushIndex: 3,
            lastPushIndex: 5,
            commentsToUpdate: [userActions[userActions.length - 1].commentId],
            hasDataToPush: true,
          },
        },
      });
    });

    it('Correctly marks first/last index and multiple comment ids, one needs push and one needs update', () => {
      const userActions = [
        ...caseUserActions,
        getUserAction('pushed', Actions.push_to_service),
        getUserAction('comment', Actions.create),
        getUserAction('pushed', Actions.push_to_service),
        { ...getUserAction('comment', Actions.create), commentId: 'muahaha' },
        getUserAction('comment', Actions.update),
        getUserAction('comment', Actions.update),
      ];
      const result = getPushedInfo(userActions, '123');
      expect(result).toEqual({
        hasDataToPush: true,
        caseServices: {
          '123': {
            ...basicPush,
            firstPushIndex: 3,
            lastPushIndex: 5,
            commentsToUpdate: [
              userActions[userActions.length - 3].commentId,
              userActions[userActions.length - 1].commentId,
            ],
            hasDataToPush: true,
          },
        },
      });
    });

    it('Does not count connector update as a reason to push', () => {
      const userActions = [
        ...caseUserActions,
        getUserAction('pushed', Actions.push_to_service),
        getUserAction('connector', Actions.update),
      ];
      const result = getPushedInfo(userActions, '123');
      expect(result).toEqual({
        hasDataToPush: false,
        caseServices: {
          '123': {
            ...basicPush,
            firstPushIndex: 3,
            lastPushIndex: 3,
            commentsToUpdate: [],
            hasDataToPush: false,
          },
        },
      });
    });

    it('Correctly handles multiple push actions', () => {
      const userActions = [
        ...caseUserActions,
        getUserAction('pushed', Actions.push_to_service),
        getUserAction('comment', Actions.create),
        getUserAction('pushed', Actions.push_to_service),
      ];
      const result = getPushedInfo(userActions, '123');
      expect(result).toEqual({
        hasDataToPush: false,
        caseServices: {
          '123': {
            ...basicPush,
            firstPushIndex: 3,
            lastPushIndex: 5,
            commentsToUpdate: [],
            hasDataToPush: false,
          },
        },
      });
    });

    it('Correctly handles comment update with multiple push actions', () => {
      const userActions = [
        ...caseUserActions,
        getUserAction('pushed', Actions.push_to_service),
        getUserAction('comment', Actions.create),
        getUserAction('pushed', Actions.push_to_service),
        getUserAction('comment', Actions.update),
      ];
      const result = getPushedInfo(userActions, '123');
      expect(result).toEqual({
        hasDataToPush: true,
        caseServices: {
          '123': {
            ...basicPush,
            firstPushIndex: 3,
            lastPushIndex: 5,
            commentsToUpdate: [userActions[userActions.length - 1].commentId],
            hasDataToPush: true,
          },
        },
      });
    });

    it('Multiple connector tracking - hasDataToPush: true', () => {
      const pushAction123 = getUserAction('pushed', Actions.push_to_service);
      const push456 = {
        ...basicPush,
        connectorId: '456',
        connectorName: 'other connector name',
        externalId: 'other_external_id',
      };

      const pushAction456 = getUserAction('pushed', Actions.push_to_service, {
        payload: { externalService: push456 },
      });

      const userActions = [
        ...caseUserActions,
        pushAction123,
        getUserAction('comment', Actions.create),
        pushAction456,
      ];

      const result = getPushedInfo(userActions, '123');

      expect(result).toEqual({
        hasDataToPush: true,
        caseServices: {
          '123': {
            ...basicPush,
            firstPushIndex: 3,
            lastPushIndex: 3,
            commentsToUpdate: [userActions[userActions.length - 2].commentId],
            hasDataToPush: true,
          },
          '456': {
            ...basicPush,
            connectorId: '456',
            connectorName: 'other connector name',
            externalId: 'other_external_id',
            firstPushIndex: 5,
            lastPushIndex: 5,
            commentsToUpdate: [],
            hasDataToPush: false,
          },
        },
      });
    });

    it('Multiple connector tracking - hasDataToPush: false', () => {
      const pushAction123 = getUserAction('pushed', Actions.push_to_service);
      const push456 = {
        ...basicPush,
        connectorId: '456',
        connectorName: 'other connector name',
        externalId: 'other_external_id',
      };

      const pushAction456 = getUserAction('pushed', Actions.push_to_service, {
        payload: { externalService: push456 },
      });

      const userActions = [
        ...caseUserActions,
        pushAction123,
        getUserAction('comment', Actions.create),
        pushAction456,
      ];

      const result = getPushedInfo(userActions, '456');
      expect(result).toEqual({
        hasDataToPush: false,
        caseServices: {
          '123': {
            ...basicPush,
            firstPushIndex: 3,
            lastPushIndex: 3,
            commentsToUpdate: [userActions[userActions.length - 2].commentId],
            hasDataToPush: true,
          },
          '456': {
            ...basicPush,
            connectorId: '456',
            connectorName: 'other connector name',
            externalId: 'other_external_id',
            firstPushIndex: 5,
            lastPushIndex: 5,
            commentsToUpdate: [],
            hasDataToPush: false,
          },
        },
      });
    });

    it('Change fields of current connector - hasDataToPush: true', () => {
      const userActions = [
        ...caseUserActions,
        createUpdate123HighPriorityConnector(),
        getUserAction('pushed', Actions.push_to_service),
        createUpdate123LowPriorityConnector(),
      ];

      const result = getPushedInfo(userActions, '123');
      expect(result).toEqual({
        hasDataToPush: true,
        caseServices: {
          '123': {
            ...basicPush,
            firstPushIndex: 4,
            lastPushIndex: 4,
            commentsToUpdate: [],
            hasDataToPush: true,
          },
        },
      });
    });

    it('Change current connector - hasDataToPush: true', () => {
      const userActions = [
        ...caseUserActions,
        getUserAction('pushed', Actions.push_to_service),
        createUpdate456HighPriorityConnector(),
      ];

      const result = getPushedInfo(userActions, '123');
      expect(result).toEqual({
        hasDataToPush: false,
        caseServices: {
          '123': {
            ...basicPush,
            firstPushIndex: 3,
            lastPushIndex: 3,
            commentsToUpdate: [],
            hasDataToPush: false,
          },
        },
      });
    });

    it('Change connector and back - hasDataToPush: true', () => {
      const userActions = [
        ...caseUserActions,
        getUserAction('pushed', Actions.push_to_service),
        createUpdate456HighPriorityConnector(),
        createUpdate123HighPriorityConnector(),
      ];

      const result = getPushedInfo(userActions, '123');
      expect(result).toEqual({
        hasDataToPush: false,
        caseServices: {
          '123': {
            ...basicPush,
            firstPushIndex: 3,
            lastPushIndex: 3,
            commentsToUpdate: [],
            hasDataToPush: false,
          },
        },
      });
    });

    it('Change fields and connector after push - hasDataToPush: true', () => {
      const userActions = [
        ...caseUserActions,
        createUpdate123HighPriorityConnector(),
        getUserAction('pushed', Actions.push_to_service),
        createUpdate456HighPriorityConnector(),
        createUpdate123LowPriorityConnector(),
      ];

      const result = getPushedInfo(userActions, '123');
      expect(result).toEqual({
        hasDataToPush: true,
        caseServices: {
          '123': {
            ...basicPush,
            firstPushIndex: 4,
            lastPushIndex: 4,
            commentsToUpdate: [],
            hasDataToPush: true,
          },
        },
      });
    });

    it('Change only connector after push - hasDataToPush: false', () => {
      const userActions = [
        ...caseUserActions,
        createUpdate123HighPriorityConnector(),
        getUserAction('pushed', Actions.push_to_service),
        createUpdate456HighPriorityConnector(),
        createUpdate123HighPriorityConnector(),
      ];

      const result = getPushedInfo(userActions, '123');
      expect(result).toEqual({
        hasDataToPush: false,
        caseServices: {
          '123': {
            ...basicPush,
            firstPushIndex: 4,
            lastPushIndex: 4,
            commentsToUpdate: [],
            hasDataToPush: false,
          },
        },
      });
    });

    it('Change connectors and fields - multiple pushes', () => {
      const pushAction123 = getUserAction('pushed', Actions.push_to_service);
      const push456 = {
        ...basicPush,
        connectorId: '456',
        connectorName: 'other connector name',
        externalId: 'other_external_id',
      };

      const pushAction456 = getUserAction('pushed', Actions.push_to_service, {
        payload: { externalService: push456 },
      });

      const userActions = [
        ...caseUserActions,
        createUpdate123HighPriorityConnector(),
        pushAction123,
        createUpdate456HighPriorityConnector(),
        pushAction456,
        createUpdate123LowPriorityConnector(),
        createUpdate456HighPriorityConnector(),
        createUpdate123LowPriorityConnector(),
      ];

      const result = getPushedInfo(userActions, '123');
      expect(result).toEqual({
        hasDataToPush: true,
        caseServices: {
          '123': {
            ...basicPush,
            firstPushIndex: 4,
            lastPushIndex: 4,
            commentsToUpdate: [],
            hasDataToPush: true,
          },
          '456': {
            ...basicPush,
            connectorId: '456',
            connectorName: 'other connector name',
            externalId: 'other_external_id',
            firstPushIndex: 6,
            lastPushIndex: 6,
            commentsToUpdate: [],
            hasDataToPush: false,
          },
        },
      });
    });

    it('pushing other connectors does not count as an update', () => {
      const pushAction123 = getUserAction('pushed', Actions.push_to_service);
      const push456 = {
        ...basicPush,
        connectorId: '456',
        connectorName: 'other connector name',
        externalId: 'other_external_id',
      };

      const pushAction456 = getUserAction('pushed', Actions.push_to_service, {
        payload: { externalService: push456 },
      });

      const userActions = [
        ...caseUserActions,
        createUpdate123HighPriorityConnector(),
        pushAction123,
        createUpdate456HighPriorityConnector(),
        pushAction456,
        createUpdate123HighPriorityConnector(),
      ];

      const result = getPushedInfo(userActions, '123');
      expect(result).toEqual({
        hasDataToPush: false,
        caseServices: {
          '123': {
            ...basicPush,
            firstPushIndex: 4,
            lastPushIndex: 4,
            commentsToUpdate: [],
            hasDataToPush: false,
          },
          '456': {
            ...basicPush,
            connectorId: '456',
            connectorName: 'other connector name',
            externalId: 'other_external_id',
            firstPushIndex: 6,
            lastPushIndex: 6,
            commentsToUpdate: [],
            hasDataToPush: false,
          },
        },
      });
    });

    it('Changing other connectors fields does not count as an update', () => {
      const userActions = [
        ...caseUserActions,
        createUpdate123HighPriorityConnector(),
        getUserAction('pushed', Actions.push_to_service),
        createUpdate456HighPriorityConnector(),
        createUpdate456HighPriorityConnector(),
      ];

      const result = getPushedInfo(userActions, '123');
      expect(result).toEqual({
        hasDataToPush: false,
        caseServices: {
          '123': {
            ...basicPush,
            firstPushIndex: 4,
            lastPushIndex: 4,
            commentsToUpdate: [],
            hasDataToPush: false,
          },
        },
      });
    });
  });
});

const jira123HighPriorityFields = {
  fields: { ...jiraFields.fields, priority: 'High' },
};

const jira123LowPriorityFields = {
  fields: { ...jiraFields.fields, priority: 'Low' },
};

const jira456Fields = {
  fields: { issueType: '10', parent: null, priority: null },
};

const jira456HighPriorityFields = {
  id: '456',
  fields: { ...jira456Fields.fields, priority: 'High' },
};

const createUpdate123HighPriorityConnector = () =>
  getUserAction('connector', Actions.update, {
    payload: { connector: getJiraConnector(jira123HighPriorityFields) },
  });

const createUpdate123LowPriorityConnector = () =>
  getUserAction('connector', Actions.update, {
    payload: { connector: getJiraConnector(jira123LowPriorityFields) },
  });

const createUpdate456HighPriorityConnector = () =>
  getUserAction('connector', Actions.update, {
    payload: { connector: getJiraConnector(jira456HighPriorityFields) },
  });
