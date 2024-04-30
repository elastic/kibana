/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-hooks';
import { useLatestFindings } from './use_latest_findings';
import { server } from '../__mocks__/node';
import { IntegrationTestProvider } from '../../../test/integration_test_provider';

beforeAll(() => server.listen());
afterAll(() => server.close());
beforeEach(() => {
  server.resetHandlers();
});

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient();
  return (
    <IntegrationTestProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </IntegrationTestProvider>
  );
};

test('useLatestFindings fetches data correctly', async () => {
  const { result, waitFor } = renderHook(
    () =>
      useLatestFindings({
        query: {
          bool: {
            must: [],
            filter: [],
            should: [],
            must_not: [],
          },
        },
        sort: [['@timestamp', 'desc']],
        enabled: true,
        pageSize: 25,
      }),
    { wrapper }
  );

  // await waitForNextUpdate();
  // console.log(result.current.data);
  await waitFor(() => result.current.data !== undefined);

  expect(result.current?.data?.pages).toEqual([{ id: '1', title: 'Test Finding' }]);
});
