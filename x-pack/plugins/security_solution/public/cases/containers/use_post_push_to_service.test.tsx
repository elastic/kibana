/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import {
  formatServiceRequestData,
  usePostPushToService,
  UsePostPushToService,
} from './use_post_push_to_service';
import {
  basicCase,
  basicComment,
  basicPush,
  pushedCase,
  serviceConnector,
  serviceConnectorUser,
} from './mock';
import * as api from './api';
import { CaseServices } from './use_get_case_user_actions';
import { CaseConnector, ConnectorTypes } from '../../../../case/common/api/connectors';

jest.mock('./api');

describe('usePostPushToService', () => {
  const abortCtrl = new AbortController();
  const updateCase = jest.fn();
  const samplePush = {
    caseId: pushedCase.id,
    caseServices: {
      '123': {
        ...basicPush,
        firstPushIndex: 1,
        lastPushIndex: 1,
        commentsToUpdate: [basicComment.id],
        hasDataToPush: false,
      },
    },
    connector: {
      id: '123',
      name: 'connector name',
      type: ConnectorTypes.jira,
      fields: { issueType: 'Task', priority: 'Low', parent: null },
    } as CaseConnector,
    updateCase,
  };
  const sampleServiceRequestData = {
    savedObjectId: pushedCase.id,
    createdAt: pushedCase.createdAt,
    createdBy: serviceConnectorUser,
    comments: [
      {
        commentId: basicComment.id,
        comment: basicComment.comment,
        createdAt: basicComment.createdAt,
        createdBy: serviceConnectorUser,
        updatedAt: null,
        updatedBy: null,
      },
    ],
    externalId: basicPush.externalId,
    description: pushedCase.description,
    title: pushedCase.title,
    updatedAt: pushedCase.updatedAt,
    updatedBy: serviceConnectorUser,
    issueType: 'Task',
    parent: null,
    priority: 'Low',
  };

  const sampleCaseServices = {
    '123': {
      ...basicPush,
      firstPushIndex: 1,
      lastPushIndex: 1,
      commentsToUpdate: [basicComment.id],
      hasDataToPush: true,
    },
    '456': {
      ...basicPush,
      connectorId: '456',
      externalId: 'other_external_id',
      firstPushIndex: 4,
      commentsToUpdate: [basicComment.id],
      lastPushIndex: 6,
      hasDataToPush: false,
    },
  };

  it('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostPushToService>(() =>
        usePostPushToService()
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        serviceData: null,
        pushedCaseData: null,
        isLoading: false,
        isError: false,
        postPushToService: result.current.postPushToService,
      });
    });
  });

  it('calls pushCase with correct arguments', async () => {
    const spyOnPushCase = jest.spyOn(api, 'pushCase');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostPushToService>(() =>
        usePostPushToService()
      );
      await waitForNextUpdate();
      result.current.postPushToService(samplePush);
      await waitForNextUpdate();
      expect(spyOnPushCase).toBeCalledWith(
        samplePush.caseId,
        {
          connector_id: samplePush.connector.id,
          connector_name: samplePush.connector.name,
          external_id: serviceConnector.id,
          external_title: serviceConnector.title,
          external_url: serviceConnector.url,
        },
        abortCtrl.signal
      );
    });
  });

  it('calls pushToService with correct arguments', async () => {
    const spyOnPushToService = jest.spyOn(api, 'pushToService');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostPushToService>(() =>
        usePostPushToService()
      );
      await waitForNextUpdate();
      result.current.postPushToService(samplePush);
      await waitForNextUpdate();
      expect(spyOnPushToService).toBeCalledWith(
        samplePush.connector.id,
        formatServiceRequestData(
          basicCase,
          samplePush.connector,
          sampleCaseServices as CaseServices
        ),
        abortCtrl.signal
      );
    });
  });

  it('calls pushToService with correct arguments when no push history', async () => {
    const samplePush2 = {
      caseId: pushedCase.id,
      caseServices: {},
      connector: {
        name: 'connector name',
        id: 'none',
        type: ConnectorTypes.none,
        fields: null,
      },
      updateCase,
    };
    const spyOnPushToService = jest.spyOn(api, 'pushToService');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostPushToService>(() =>
        usePostPushToService()
      );
      await waitForNextUpdate();
      result.current.postPushToService(samplePush2);
      await waitForNextUpdate();
      expect(spyOnPushToService).toBeCalledWith(
        samplePush2.connector.id,
        formatServiceRequestData(basicCase, samplePush2.connector, {}),
        abortCtrl.signal
      );
    });
  });

  it('post push to service', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostPushToService>(() =>
        usePostPushToService()
      );
      await waitForNextUpdate();
      result.current.postPushToService(samplePush);
      await waitForNextUpdate();
      expect(result.current).toEqual({
        serviceData: serviceConnector,
        pushedCaseData: pushedCase,
        isLoading: false,
        isError: false,
        postPushToService: result.current.postPushToService,
      });
    });
  });

  it('set isLoading to true when deleting cases', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostPushToService>(() =>
        usePostPushToService()
      );
      await waitForNextUpdate();
      result.current.postPushToService(samplePush);
      expect(result.current.isLoading).toBe(true);
    });
  });

  it('formatServiceRequestData - current connector', () => {
    const caseServices = sampleCaseServices;
    const result = formatServiceRequestData(pushedCase, samplePush.connector, caseServices);
    expect(result).toEqual(sampleServiceRequestData);
  });

  it('formatServiceRequestData - connector with history', () => {
    const caseServices = sampleCaseServices;
    const connector = {
      id: '456',
      name: 'connector 2',
      type: ConnectorTypes.jira,
      fields: { issueType: 'Task', priority: 'High', parent: 'RJ-01' },
    };
    const result = formatServiceRequestData(pushedCase, connector as CaseConnector, caseServices);
    expect(result).toEqual({
      ...sampleServiceRequestData,
      ...connector.fields,
      externalId: 'other_external_id',
    });
  });

  it('formatServiceRequestData - new connector', () => {
    const caseServices = {
      '123': sampleCaseServices['123'],
    };
    const connector = {
      id: '456',
      name: 'connector 2',
      type: ConnectorTypes.jira,
      fields: { issueType: 'Task', priority: 'High', parent: null },
    };
    const result = formatServiceRequestData(pushedCase, connector as CaseConnector, caseServices);
    expect(result).toEqual({
      ...sampleServiceRequestData,
      ...connector.fields,
      externalId: null,
    });
  });

  it('unhappy path', async () => {
    const spyOnPushToService = jest.spyOn(api, 'pushToService');
    spyOnPushToService.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostPushToService>(() =>
        usePostPushToService()
      );
      await waitForNextUpdate();
      result.current.postPushToService(samplePush);
      await waitForNextUpdate();

      expect(result.current).toEqual({
        serviceData: null,
        pushedCaseData: null,
        isLoading: false,
        isError: true,
        postPushToService: result.current.postPushToService,
      });
    });
  });
});
