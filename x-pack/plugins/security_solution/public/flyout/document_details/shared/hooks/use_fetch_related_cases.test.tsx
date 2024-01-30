/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useFetchRelatedCases } from './use_fetch_related_cases';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import React from 'react';

const eventId = 'eventId';

const createWrapper = () => {
  const queryClient = new QueryClient();
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useFetchRelatedCases', () => {
  it(`should return loading true while data is loading`, () => {
    const hookResult = renderHook(() => useFetchRelatedCases({ eventId }), {
      wrapper: createWrapper(),
    });

    expect(hookResult.result.current.loading).toEqual(true);
    expect(hookResult.result.current.error).toEqual(false);
    expect(hookResult.result.current.data).toEqual([]);
    expect(hookResult.result.current.dataCount).toEqual(0);
  });
});
