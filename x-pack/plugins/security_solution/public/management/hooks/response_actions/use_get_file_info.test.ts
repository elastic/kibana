/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender, ReactQueryHookRenderer } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { responseActionsHttpMocks } from '../../mocks/response_actions_http_mocks';
import { useGetFileInfo } from './use_get_file_info';
import { resolvePathVariables } from '../../../common/utils/resolve_path_variables';
import { ACTION_AGENT_FILE_INFO_ROUTE } from '../../../../common/endpoint/constants';
import type {
  ActionDetails,
  ResponseActionGetFileOutputContent,
  ResponseActionGetFileParameters,
} from '../../../../common/endpoint/types';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';
import { useQuery as _useQuery } from '@tanstack/react-query';

const useQueryMock = _useQuery as jest.Mock;

jest.mock('@tanstack/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@tanstack/react-query');

  return {
    ...actualReactQueryModule,
    useQuery: jest.fn((...args) => actualReactQueryModule.useQuery(...args)),
  };
});

describe('When using the `useGetFileInfo()` hook', () => {
  let renderReactQueryHook: ReactQueryHookRenderer<
    Parameters<typeof useGetFileInfo>,
    ReturnType<typeof useGetFileInfo>
  >;
  let http: AppContextTestRender['coreStart']['http'];
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;
  let actionDetailsMock: ActionDetails;

  beforeEach(() => {
    const testContext = createAppRootMockRenderer();

    renderReactQueryHook = testContext.renderReactQueryHook as typeof renderReactQueryHook;
    http = testContext.coreStart.http;

    apiMocks = responseActionsHttpMocks(http);

    actionDetailsMock = new EndpointActionGenerator('seed').generateActionDetails<
      ResponseActionGetFileOutputContent,
      ResponseActionGetFileParameters
    >({
      command: 'get-file',
    });
  });

  it('should call the correct API', async () => {
    await renderReactQueryHook(() => useGetFileInfo(actionDetailsMock));

    expect(apiMocks.responseProvider.fileInfo).toHaveBeenCalledWith({
      version: '2023-10-31',
      path: resolvePathVariables(ACTION_AGENT_FILE_INFO_ROUTE, {
        action_id: '123',
        file_id: '123.agent-a',
      }),
    });
  });

  it('should allow specific agent id to be set on input', async () => {
    await renderReactQueryHook(() => useGetFileInfo(actionDetailsMock, 'agent-a'));

    expect(apiMocks.responseProvider.fileInfo).toHaveBeenCalledWith({
      version: '2023-10-31',
      path: resolvePathVariables(ACTION_AGENT_FILE_INFO_ROUTE, {
        action_id: '123',
        file_id: '123.agent-a',
      }),
    });
  });

  it('should allow custom options ot be used', async () => {
    await renderReactQueryHook(() =>
      useGetFileInfo(actionDetailsMock, undefined, {
        queryKey: ['a', 'b'],
        enabled: true,
        retry: false,
      })
    );

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['a', 'b'],
        enabled: true,
        retry: false,
      })
    );
  });
});
