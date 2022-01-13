/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { usePostPushToService, UsePostPushToService } from './use_post_push_to_service';
import { pushedCase } from './mock';
import * as api from './api';
import { CaseConnector, ConnectorTypes } from '../../common/api';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('usePostPushToService', () => {
  const abortCtrl = new AbortController();
  const connector = {
    id: '123',
    name: 'connector name',
    type: ConnectorTypes.jira,
    fields: { issueType: 'Task', priority: 'Low', parent: null },
  } as CaseConnector;
  const caseId = pushedCase.id;

  it('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostPushToService>(() =>
        usePostPushToService()
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
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
      result.current.pushCaseToExternalService({ caseId, connector });
      await waitForNextUpdate();
      expect(spyOnPushToService).toBeCalledWith(caseId, connector.id, abortCtrl.signal);
    });
  });

  it('post push to service', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostPushToService>(() =>
        usePostPushToService()
      );
      await waitForNextUpdate();
      result.current.pushCaseToExternalService({ caseId, connector });
      await waitForNextUpdate();
      expect(result.current).toEqual({
        isLoading: false,
        isError: false,
        pushCaseToExternalService: result.current.pushCaseToExternalService,
      });
    });
  });

  it('set isLoading to true when pushing case', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostPushToService>(() =>
        usePostPushToService()
      );
      await waitForNextUpdate();
      result.current.pushCaseToExternalService({ caseId, connector });
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
      result.current.pushCaseToExternalService({ caseId, connector });

      expect(result.current).toEqual({
        isLoading: false,
        isError: true,
        pushCaseToExternalService: result.current.pushCaseToExternalService,
      });
    });
  });
});
