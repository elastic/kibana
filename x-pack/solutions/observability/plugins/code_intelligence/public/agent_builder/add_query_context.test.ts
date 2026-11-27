/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';

import { useAddQueryToAgent } from './add_query_context';

const createAgentBuilder = (access: { hasRequiredLicense: boolean; hasLlmConnector: boolean }) => ({
  getAgentBuilderAccess: jest.fn().mockResolvedValue(access),
});

const stager = { addQuery: jest.fn() };
const toasts = { addSuccess: jest.fn() };

describe('useAddQueryToAgent', () => {
  it('is available once the user can chat', async () => {
    const agentBuilder = createAgentBuilder({ hasRequiredLicense: true, hasLlmConnector: true });
    const { result } = renderHook(() => useAddQueryToAgent({ agentBuilder, stager, toasts }));

    expect(result.current).toBeUndefined();
    await waitFor(() => expect(result.current).toBeDefined());

    result.current!({ id: 'entry-1', query: 'FROM logs-*' });
    expect(stager.addQuery).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'entry-1', type: 'esql' })
    );
  });

  it.each([
    ['license', { hasRequiredLicense: false, hasLlmConnector: true }],
    ['LLM connector', { hasRequiredLicense: true, hasLlmConnector: false }],
  ])('is absent without the %s', async (_, access) => {
    const agentBuilder = createAgentBuilder(access);
    const { result } = renderHook(() => useAddQueryToAgent({ agentBuilder, stager, toasts }));

    await waitFor(() => expect(agentBuilder.getAgentBuilderAccess).toHaveBeenCalled());
    await Promise.resolve();
    expect(result.current).toBeUndefined();
  });

  it('is absent without Agent Builder', () => {
    const { result } = renderHook(() =>
      useAddQueryToAgent({ agentBuilder: undefined, stager: undefined, toasts })
    );

    expect(result.current).toBeUndefined();
  });
});
