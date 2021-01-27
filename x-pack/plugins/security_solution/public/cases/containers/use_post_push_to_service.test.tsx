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
import { CaseConnector, ConnectorTypes, CommentType } from '../../../../case/common/api';
import moment from 'moment';
jest.mock('./api');
jest.mock('../../common/components/link_to', () => {
  const originalModule = jest.requireActual('../../common/components/link_to');
  return {
    ...originalModule,
    getTimelineTabsUrl: jest.fn(),
    useFormatUrl: jest.fn().mockReturnValue({ formatUrl: jest.fn(), search: 'urlSearch' }),
  };
});
describe('usePostPushToService', () => {
  const abortCtrl = new AbortController();
  const updateCase = jest.fn();
  const formatUrl = jest.fn();

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
    alerts: {
      'alert-id-1': {
        _id: 'alert-id-1',
        _index: 'alert-index-1',
        '@timestamp': '2020-11-20T15:35:28.373Z',
        rule: {
          id: 'rule-id-1',
          name: 'Awesome rule',
          from: 'now-360s',
          to: 'now',
        },
      },
    },
  };

  const sampleServiceRequestData = {
    savedObjectId: pushedCase.id,
    createdAt: pushedCase.createdAt,
    createdBy: serviceConnectorUser,
    comments: [
      {
        commentId: basicComment.id,
        comment: basicComment.type === CommentType.user ? basicComment.comment : '',
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
        samplePush.connector.type,
        formatServiceRequestData({
          myCase: basicCase,
          connector: samplePush.connector,
          caseServices: sampleCaseServices as CaseServices,
          alerts: samplePush.alerts,
          formatUrl,
        }),
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
      alerts: samplePush.alerts,
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
        samplePush2.connector.type,
        formatServiceRequestData({
          myCase: basicCase,
          connector: samplePush2.connector,
          caseServices: {},
          alerts: samplePush.alerts,
          formatUrl,
        }),
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
    const result = formatServiceRequestData({
      myCase: pushedCase,
      connector: samplePush.connector,
      caseServices,
      alerts: samplePush.alerts,
      formatUrl,
    });
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
    const result = formatServiceRequestData({
      myCase: pushedCase,
      connector: connector as CaseConnector,
      caseServices,
      alerts: samplePush.alerts,
      formatUrl,
    });
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

    const result = formatServiceRequestData({
      myCase: pushedCase,
      connector: connector as CaseConnector,
      caseServices,
      alerts: samplePush.alerts,
      formatUrl,
    });

    expect(result).toEqual({
      ...sampleServiceRequestData,
      ...connector.fields,
      externalId: null,
    });
  });

  it('formatServiceRequestData - Alert comment content', () => {
    const mockDuration = moment.duration(1);
    jest.spyOn(moment, 'duration').mockReturnValue(mockDuration);
    formatUrl.mockReturnValue('https://app.com/detections');
    const caseServices = sampleCaseServices;
    const result = formatServiceRequestData({
      myCase: {
        ...pushedCase,
        comments: [
          {
            ...pushedCase.comments[0],
            type: CommentType.alert,
            alertId: 'alert-id-1',
            index: 'alert-index-1',
          },
        ],
      },
      connector: samplePush.connector,
      caseServices,
      alerts: samplePush.alerts,
      formatUrl,
    });

    expect(result.comments![0].comment).toEqual(
      '[Alert](https://app.com/detections?filters=!((%27$state%27:(store:appState),meta:(alias:!n,disabled:!f,key:_id,negate:!f,params:(query:alert-id-1),type:phrase),query:(match:(_id:(query:alert-id-1,type:phrase)))))&sourcerer=(default:!())&timerange=(global:(linkTo:!(timeline),timerange:(from:%272020-11-20T15:35:28.372Z%27,kind:absolute,to:%272020-11-20T15:35:28.373Z%27)),timeline:(linkTo:!(global),timerange:(from:%272020-11-20T15:35:28.372Z%27,kind:absolute,to:%272020-11-20T15:35:28.373Z%27)))) added to case.'
    );
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
