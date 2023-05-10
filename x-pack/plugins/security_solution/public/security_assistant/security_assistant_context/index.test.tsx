/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import React from 'react';

import { SecurityAssistantProvider, useSecurityAssistantContext } from '.';

const mockHttpFetch = jest.fn();
const ContextWrapper: React.FC = ({ children }) => (
  <SecurityAssistantProvider httpFetch={mockHttpFetch}>{children}</SecurityAssistantProvider>
);

describe('SecurityAssistantContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it throws an error when useSecurityAssistantContext hook is used without a SecurityAssistantContext', () => {
    const { result } = renderHook(useSecurityAssistantContext);

    expect(result.error).toEqual(
      new Error('useSecurityAssistantContext must be used within a SecurityAssistantProvider')
    );
  });

  test('it should return the httpFetch function', async () => {
    const { result } = renderHook(useSecurityAssistantContext, { wrapper: ContextWrapper });
    const httpFetch = await result.current.httpFetch;

    const path = '/path/to/resource';
    httpFetch(path);

    expect(mockHttpFetch).toBeCalledWith(path);
  });
});
