/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { usePostPushToService, UsePostPushToService } from './use_post_push_to_service';
import { basicComment, basicPush, pushedCase, serviceConnector } from './mock';
import * as api from './api';
import { CaseConnector, ConnectorTypes } from '../../../../case/common/api';

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
        pushCaseToExternalService: result.current.pushCaseToExternalService,
      });
    });
  });

  it('calls pushCase with correct arguments', async () => {
    const spyOnPushToService = jest.spyOn(api, 'pushCase');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostPushToService>(() =>
        usePostPushToService()
      );
      await waitForNextUpdate();
      result.current.pushCaseToExternalService(samplePush);
      await waitForNextUpdate();
      expect(spyOnPushToService).toBeCalledWith(
        samplePush.caseId,
        samplePush.connector.id,
        abortCtrl.signal
      );
    });
  });

  it('calls pushCase with correct arguments when no push history', async () => {
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
    const spyOnPushToService = jest.spyOn(api, 'pushCase');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostPushToService>(() =>
        usePostPushToService()
      );
      await waitForNextUpdate();
      result.current.pushCaseToExternalService(samplePush2);
      await waitForNextUpdate();
      expect(spyOnPushToService).toBeCalledWith(
        samplePush2.connector.id,
        samplePush2.connector.type,
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
      result.current.pushCaseToExternalService(samplePush);
      await waitForNextUpdate();
      expect(result.current).toEqual({
        serviceData: serviceConnector,
        pushedCaseData: pushedCase,
        isLoading: false,
        isError: false,
        pushCaseToExternalService: result.current.pushCaseToExternalService,
      });
    });
  });

  it('set isLoading to true when deleting cases', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostPushToService>(() =>
        usePostPushToService()
      );
      await waitForNextUpdate();
      result.current.pushCaseToExternalService(samplePush);
      expect(result.current.isLoading).toBe(true);
    });
  });

  it('unhappy path', async () => {
    const spyOnPushToService = jest.spyOn(api, 'pushCase');
    spyOnPushToService.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostPushToService>(() =>
        usePostPushToService()
      );
      await waitForNextUpdate();
      result.current.pushCaseToExternalService(samplePush);
      await waitForNextUpdate();

      expect(result.current).toEqual({
        serviceData: null,
        pushedCaseData: null,
        isLoading: false,
        isError: true,
        pushCaseToExternalService: result.current.pushCaseToExternalService,
      });
    });
  });
});
