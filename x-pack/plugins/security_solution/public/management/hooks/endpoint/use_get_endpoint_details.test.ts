/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppContextTestRender, ReactQueryHookRenderer } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { useGetEndpointDetails } from './use_get_endpoint_details';
import { resolvePathVariables } from '../../../common/utils/resolve_path_variables';
import { HOST_METADATA_GET_ROUTE } from '../../../../common/endpoint/constants';
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

describe('useGetEndpointDetails hook', () => {
  let renderReactQueryHook: ReactQueryHookRenderer<
    Parameters<typeof useGetEndpointDetails>,
    ReturnType<typeof useGetEndpointDetails>
  >;
  let http: AppContextTestRender['coreStart']['http'];
  let apiMocks: ReturnType<typeof endpointMetadataHttpMocks>;

  beforeEach(() => {
    const testContext = createAppRootMockRenderer();

    renderReactQueryHook = testContext.renderReactQueryHook as typeof renderReactQueryHook;
    http = testContext.coreStart.http;

    apiMocks = endpointMetadataHttpMocks(http);
  });

  it('should call the proper API', async () => {
    await renderReactQueryHook(() => useGetEndpointDetails('123'));

    expect(apiMocks.responseProvider.metadataDetails).toHaveBeenCalledWith({
      path: resolvePathVariables(HOST_METADATA_GET_ROUTE, { id: '123' }),
    });
  });

  it('should call api with `undefined` for endpoint id if it was not defined on input', async () => {
    await renderReactQueryHook(() => useGetEndpointDetails(''));

    expect(apiMocks.responseProvider.metadataDetails).toHaveBeenCalledWith({
      path: resolvePathVariables(HOST_METADATA_GET_ROUTE, { id: 'undefined' }),
    });
  });

  it('should allow custom options to be used', async () => {
    await renderReactQueryHook(
      () => useGetEndpointDetails('123', { queryKey: ['1', '2'], enabled: false }),
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
