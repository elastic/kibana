/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from 'react-query';
import { HttpSetup } from 'kibana/public';
import { CreateExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { coreMock } from '../../../../../../../src/core/public/mocks';

export const getFakeListId: () => string = () => 'FAKE_LIST_ID';
export const getFakeListDefinition: () => CreateExceptionListSchema = () => ({
  name: 'FAKE_LIST_NAME',
  namespace_type: 'agnostic',
  description: 'FAKE_LIST_DESCRIPTION',
  list_id: getFakeListId(),
  type: 'endpoint',
});

export const getFakeHttpService = () => {
  const fakeCoreStart = coreMock.createStart({ basePath: '/mock' });
  const fakeHttpServices = fakeCoreStart.http as jest.Mocked<HttpSetup>;
  fakeHttpServices.post.mockClear();
  fakeHttpServices.get.mockClear();
  fakeHttpServices.put.mockClear();
  fakeHttpServices.delete.mockClear();

  return fakeHttpServices;
};

export const render = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hook: () => any,
  waitForHook: 'isSuccess' | 'isLoading' | 'isError' = 'isSuccess'
) => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }): JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result: resultHook, waitFor } = renderHook(() => hook(), {
    wrapper,
  });
  await waitFor(() => resultHook.current[waitForHook]);
  return resultHook.current;
};
