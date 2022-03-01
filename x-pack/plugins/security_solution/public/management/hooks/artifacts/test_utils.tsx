/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { HttpSetup } from 'kibana/public';
import { CreateExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { ReactQueryClientProvider } from '../../../common/containers/query_client/query_client_provider';

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

export const renderQuery = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hook: () => any,
  waitForHook: 'isSuccess' | 'isLoading' | 'isError' = 'isSuccess'
) => {
  const wrapper = ({ children }: { children: React.ReactNode }): JSX.Element => (
    <ReactQueryClientProvider>{children}</ReactQueryClientProvider>
  );
  const { result: resultHook, waitFor } = renderHook(() => hook(), {
    wrapper,
  });
  await waitFor(() => resultHook.current[waitForHook]);
  return resultHook.current;
};

export const renderMutation = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hook: () => any
) => {
  const wrapper = ({ children }: { children: React.ReactNode }): JSX.Element => (
    <ReactQueryClientProvider>{children}</ReactQueryClientProvider>
  );
  const { result: resultHook } = renderHook(() => hook(), {
    wrapper,
  });
  return resultHook.current;
};
