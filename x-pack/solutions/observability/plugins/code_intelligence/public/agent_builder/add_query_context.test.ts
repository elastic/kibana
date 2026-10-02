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
  openChat: jest.fn(),
  addAttachment: jest.fn(),
});

const sidebar = { isOpen: () => true };
const toasts = { addSuccess: jest.fn() };

describe('useAddQueryToAgent', () => {
  it('is available once the user can chat', async () => {
    const agentBuilder = createAgentBuilder({ hasRequiredLicense: true, hasLlmConnector: true });
    const { result } = renderHook(() =>
      useAddQueryToAgent({ agentBuilder, sidebar, toasts, pageContext: undefined })
    );

    expect(result.current).toBeUndefined();
    await waitFor(() => expect(result.current).toBeDefined());

    result.current!({ id: 'entry-1', query: 'FROM logs-*' });
    expect(agentBuilder.addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'entry-1', type: 'esql' })
    );
  });

  it.each([
    ['license', { hasRequiredLicense: false, hasLlmConnector: true }],
    ['LLM connector', { hasRequiredLicense: true, hasLlmConnector: false }],
  ])('is absent without the %s', async (_, access) => {
    const agentBuilder = createAgentBuilder(access);
    const { result } = renderHook(() =>
      useAddQueryToAgent({ agentBuilder, sidebar, toasts, pageContext: undefined })
    );

    await waitFor(() => expect(agentBuilder.getAgentBuilderAccess).toHaveBeenCalled());
    await Promise.resolve();
    expect(result.current).toBeUndefined();
  });

  it('is absent without Agent Builder', () => {
    const { result } = renderHook(() =>
      useAddQueryToAgent({
        agentBuilder: undefined,
        sidebar: undefined,
        toasts,
        pageContext: undefined,
      })
    );

    expect(result.current).toBeUndefined();
  });
});
