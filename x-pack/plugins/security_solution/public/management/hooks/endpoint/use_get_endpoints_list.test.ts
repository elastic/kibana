/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender, ReactQueryHookRenderer } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { useGetEndpointsList } from './use_get_endpoints_list';
import { HOST_METADATA_LIST_ROUTE } from '../../../../common/endpoint/constants';
import { useQuery as _useQuery } from '@tanstack/react-query';
import { endpointMetadataHttpMocks } from '../../pages/endpoint_hosts/mocks';

const useQueryMock = _useQuery as jest.Mock;

jest.mock('@tanstack/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@tanstack/react-query');

  return {
    ...actualReactQueryModule,
    useQuery: jest.fn((...args) => actualReactQueryModule.useQuery(...args)),
  };
});

describe('useGetEndpointsList hook', () => {
  let renderReactQueryHook: ReactQueryHookRenderer<
    Parameters<typeof useGetEndpointsList>,
    ReturnType<typeof useGetEndpointsList>
  >;
  let http: AppContextTestRender['coreStart']['http'];
  let apiMocks: ReturnType<typeof endpointMetadataHttpMocks>;

  beforeEach(() => {
    const testContext = createAppRootMockRenderer();

    renderReactQueryHook = testContext.renderReactQueryHook as typeof renderReactQueryHook;
    http = testContext.coreStart.http;

    apiMocks = endpointMetadataHttpMocks(http);
  });

  it('should call the API with kuery set to look for all hostnames when no search string given', async () => {
    await renderReactQueryHook(() => useGetEndpointsList({ searchString: '' }));

    expect(apiMocks.responseProvider.metadataList).toHaveBeenCalledWith({
      path: HOST_METADATA_LIST_ROUTE,
      query: { page: 0, pageSize: 50, kuery: 'united.endpoint.host.hostname:*' },
    });
  });

  it('should call the API with kuery set to look for all matching hostnames', async () => {
    await renderReactQueryHook(() => useGetEndpointsList({ searchString: 'xyz' }));

    expect(apiMocks.responseProvider.metadataList).toHaveBeenCalledWith({
      path: HOST_METADATA_LIST_ROUTE,
      query: { page: 0, pageSize: 50, kuery: 'united.endpoint.host.hostname:*xyz*' },
    });
  });

  it('should call the API with kuery set to look for all matching agentIds if present', async () => {
    await renderReactQueryHook(() =>
      useGetEndpointsList({ searchString: '', selectedAgentIds: ['agent-a', 'agent-b'] })
    );

    expect(apiMocks.responseProvider.metadataList).toHaveBeenCalledWith({
      path: HOST_METADATA_LIST_ROUTE,
      query: {
        page: 0,
        pageSize: 10000,
        kuery:
          'united.endpoint.agent.id:"agent-a" or united.endpoint.agent.id:"agent-b" or united.endpoint.host.hostname:*',
      },
    });
  });

  it('should call the API with kuery set to look for all matching agentIds and hostnames', async () => {
    await renderReactQueryHook(() =>
      useGetEndpointsList({ searchString: 'xyz', selectedAgentIds: ['agent-a', 'agent-b'] })
    );

    expect(apiMocks.responseProvider.metadataList).toHaveBeenCalledWith({
      path: HOST_METADATA_LIST_ROUTE,
      query: {
        page: 0,
        pageSize: 10000,
        kuery:
          'united.endpoint.agent.id:"agent-a" or united.endpoint.agent.id:"agent-b" or united.endpoint.host.hostname:*xyz*',
      },
    });
  });

  it('should allow custom options to be used', async () => {
    await renderReactQueryHook(
      () =>
        useGetEndpointsList({
          searchString: 'pqr',
          options: { queryKey: ['m', 'n'], enabled: false },
        }),
      false
    );

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['m', 'n'],
        enabled: false,
      })
    );
  });
});
