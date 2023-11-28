/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender, ReactQueryHookRenderer } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { useGetEndpointPendingActionsSummary } from './use_get_endpoint_pending_actions_summary';
import { ACTION_STATUS_ROUTE } from '../../../../common/endpoint/constants';
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

describe('useGetEndpointPendingActionsSummary hook', () => {
  let renderReactQueryHook: ReactQueryHookRenderer<
    Parameters<typeof useGetEndpointPendingActionsSummary>,
    ReturnType<typeof useGetEndpointPendingActionsSummary>
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
    await renderReactQueryHook(() => useGetEndpointPendingActionsSummary(['123', '456']));

    expect(apiMocks.responseProvider.agentPendingActionsSummary).toHaveBeenCalledWith({
      path: `${ACTION_STATUS_ROUTE}`,
      query: { agent_ids: ['123', '456'] },
      version: '2023-10-31',
    });
  });

  it('should allow custom options to be used', async () => {
    await renderReactQueryHook(
      () =>
        useGetEndpointPendingActionsSummary(['123', '456'], {
          queryKey: ['1', '2'],
          enabled: false,
        }),
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
