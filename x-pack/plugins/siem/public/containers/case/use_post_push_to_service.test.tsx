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
import { basicCase, pushedCase, serviceConnector } from './mock';
import * as api from './api';

jest.mock('./api');

describe('usePostPushToService', () => {
  const abortCtrl = new AbortController();
  const updateCase = jest.fn();
  const samplePush = {
    caseId: pushedCase.id,
    connectorName: 'sample',
    connectorId: '22',
    updateCase,
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
          connector_id: samplePush.connectorId,
          connector_name: samplePush.connectorName,
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
        samplePush.connectorId,
        formatServiceRequestData(basicCase),
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
