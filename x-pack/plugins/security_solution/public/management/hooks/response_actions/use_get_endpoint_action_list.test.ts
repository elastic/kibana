/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender, ReactQueryHookRenderer } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { useGetEndpointActionList } from './use_get_endpoint_action_list';
import { ENDPOINTS_ACTION_LIST_ROUTE } from '../../../../common/endpoint/constants';
import { useQuery as _useQuery } from '@tanstack/react-query';
import { responseActionsHttpMocks } from '../../mocks/response_actions_http_mocks';

const useQueryMock = _useQuery as jest.Mock;

jest.mock('@tanstack/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@tanstack/react-query');

  return {
    ...actualReactQueryModule,
    useQuery: jest.fn((...args) => actualReactQueryModule.useQuery(...args)),
  };
});

describe('useGetEndpointActionList hook', () => {
  let renderReactQueryHook: ReactQueryHookRenderer<
    Parameters<typeof useGetEndpointActionList>,
    ReturnType<typeof useGetEndpointActionList>
  >;
  let http: AppContextTestRender['coreStart']['http'];
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;

  beforeEach(() => {
    const testContext = createAppRootMockRenderer();

    renderReactQueryHook = testContext.renderReactQueryHook as typeof renderReactQueryHook;
    http = testContext.coreStart.http;

    apiMocks = responseActionsHttpMocks(http);
  });

  it('should call the proper API', async () => {
    await renderReactQueryHook(() =>
      useGetEndpointActionList({
        agentIds: ['123', '456'],
        userIds: ['elastic', 'citsale'],
        commands: ['isolate', 'unisolate'],
        statuses: ['pending', 'successful'],
        page: 2,
        pageSize: 20,
        startDate: 'now-5d',
        endDate: 'now',
      })
    );

    expect(apiMocks.responseProvider.actionList).toHaveBeenCalledWith({
      path: `${ENDPOINTS_ACTION_LIST_ROUTE}`,
      query: {
        agentIds: ['123', '456'],
        commands: ['isolate', 'unisolate'],
        statuses: ['pending', 'successful'],
        endDate: 'now',
        page: 2,
        pageSize: 20,
        startDate: 'now-5d',
        userIds: ['*elastic*', '*citsale*'],
      },
    });
  });

  it('should allow custom options to be used', async () => {
    await renderReactQueryHook(
      () =>
        useGetEndpointActionList(
          {},
          {
            queryKey: ['1', '2'],
            enabled: false,
          }
        ),
      false
    );

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['1', '2'],
        enabled: false,
      })
    );
  });
});
