/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import type { UseGetCaseUserActions } from './use_get_case_user_actions';
import { getPushedInfo, useGetCaseUserActions } from './use_get_case_user_actions';
import {
  basicCase,
  basicPush,
  caseUserActions,
  elasticUser,
  getJiraConnector,
  getUserAction,
  jiraFields,
} from './mock';
import { Actions } from '../../common/api';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { testQueryClient } from '../common/mock';
import { waitFor } from '@testing-library/dom';
import * as api from './api';
import { useToasts } from '../common/lib/kibana';

jest.mock('./api');
jest.mock('../common/lib/kibana');

const initialData = {
  data: undefined,
  isError: false,
  isLoading: true,
};

const wrapper: React.FC<string> = ({ children }) => (
  <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
);

describe('useGetCaseUserActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('returns proper state on getCaseUserActions', async () => {
    await act(async () => {
      const { result } = renderHook<string, UseGetCaseUserActions>(
        () => useGetCaseUserActions(basicCase.id, basicCase.connector.id),
        { wrapper }
      );
      await waitFor(() => {
        expect(result.current).toEqual(
          expect.objectContaining({
            ...initialData,
            data: {
              caseUserActions,
              caseServices: {},
              hasDataToPush: true,
              participants: [elasticUser],
              profileUids: new Set(),
            },
            isError: false,
            isLoading: false,
            isFetching: false,
          })
        );
      });
    });
  });

  it('shows a toast error when the API returns an error', async () => {
    const spy = jest.spyOn(api, 'getCaseUserActions').mockRejectedValue(new Error("C'est la vie"));

    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    const { waitForNextUpdate } = renderHook<string, UseGetCaseUserActions>(
      () => useGetCaseUserActions(basicCase.id, basicCase.connector.id),
      { wrapper }
    );
    await waitForNextUpdate();
    expect(spy).toHaveBeenCalledWith(basicCase.id, expect.any(AbortSignal));
    expect(addError).toHaveBeenCalled();
  });

  describe('getProfileUids', () => {
    it('aggregates the uids from the createdBy field of a user action', async () => {
      jest
        .spyOn(api, 'getCaseUserActions')
        .mockReturnValue(
          Promise.resolve([
            getUserAction('pushed', Actions.add, { createdBy: { profileUid: '456' } }),
          ])
        );

      await act(async () => {
        const { result } = renderHook<string, UseGetCaseUserActions>(
          () => useGetCaseUserActions(basicCase.id, basicCase.connector.id),
          { wrapper }
        );

        await waitFor(() => {
          expect(result.current.data?.profileUids).toMatchInlineSnapshot(`
            Set {
              "456",
            }
          `);
        });
      });
    });

    it('aggregates the uids from a push', async () => {
      jest.spyOn(api, 'getCaseUserActions').mockReturnValue(
        Promise.resolve([
          getUserAction('pushed', Actions.add, {
            payload: { externalService: { pushedBy: { profileUid: '123' } } },
          }),
        ])
      );

      await act(async () => {
        const { result } = renderHook<string, UseGetCaseUserActions>(
          () => useGetCaseUserActions(basicCase.id, basicCase.connector.id),
          { wrapper }
        );

        await waitFor(() => {
          expect(result.current.data?.profileUids).toMatchInlineSnapshot(`
            Set {
              "123",
            }
          `);
        });
      });
    });

    it('aggregates the uids from an assignment add user action', async () => {
      jest
        .spyOn(api, 'getCaseUserActions')
        .mockReturnValue(
          Promise.resolve([...caseUserActions, getUserAction('assignees', Actions.add)])
        );

      await act(async () => {
        const { result } = renderHook<string, UseGetCaseUserActions>(
          () => useGetCaseUserActions(basicCase.id, basicCase.connector.id),
          { wrapper }
        );

        await waitFor(() => {
          expect(result.current.data?.profileUids).toMatchInlineSnapshot(`
            Set {
              "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
              "u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0",
            }
          `);
        });
      });
    });

    it('ignores duplicate uids', async () => {
      jest
        .spyOn(api, 'getCaseUserActions')
        .mockReturnValue(
          Promise.resolve([
            ...caseUserActions,
            getUserAction('assignees', Actions.add),
            getUserAction('assignees', Actions.add),
          ])
        );

      await act(async () => {
        const { result } = renderHook<string, UseGetCaseUserActions>(
          () => useGetCaseUserActions(basicCase.id, basicCase.connector.id),
          { wrapper }
        );

        await waitFor(() => {
          expect(result.current.data?.profileUids).toMatchInlineSnapshot(`
            Set {
              "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
              "u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0",
            }
          `);
        });
      });
    });

    it('aggregates the uids from an assignment delete user action', async () => {
      jest
        .spyOn(api, 'getCaseUserActions')
        .mockReturnValue(
          Promise.resolve([...caseUserActions, getUserAction('assignees', Actions.delete)])
        );

      await act(async () => {
        const { result } = renderHook<string, UseGetCaseUserActions>(
          () => useGetCaseUserActions(basicCase.id, basicCase.connector.id),
          { wrapper }
        );

        await waitFor(() => {
          expect(result.current.data?.profileUids).toMatchInlineSnapshot(`
            Set {
              "u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0",
              "u_A_tM4n0wPkdiQ9smmd8o0Hr_h61XQfu8aRPh9GMoRoc_0",
            }
          `);
        });
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
