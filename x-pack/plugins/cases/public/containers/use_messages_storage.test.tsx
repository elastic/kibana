/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { act, waitFor } from '@testing-library/react';
import type { UseMessagesStorage } from './use_messages_storage';
import { useMessagesStorage } from './use_messages_storage';

describe('useMessagesStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('should return an empty array when there is no messages', async () => {
    const { result } = renderHook<string, UseMessagesStorage>(() => useMessagesStorage());
    await waitFor(() => null);
    const { getMessages } = result.current;
    await act(async () => {
      expect(getMessages('case')).toEqual([]);
    });
  });

  it('should add a message', async () => {
    const { result } = renderHook<string, UseMessagesStorage>(() => useMessagesStorage());
    await waitFor(() => null);
    const { getMessages, addMessage } = result.current;
    await act(async () => {
      addMessage('case', 'id-1');
      expect(getMessages('case')).toEqual(['id-1']);
    });
  });

  it('should add multiple messages', async () => {
    const { result } = renderHook<string, UseMessagesStorage>(() => useMessagesStorage());
    await waitFor(() => null);
    const { getMessages, addMessage } = result.current;
    await act(async () => {
      addMessage('case', 'id-1');
      addMessage('case', 'id-2');
      expect(getMessages('case')).toEqual(['id-1', 'id-2']);
    });
  });

  it('should remove a message', async () => {
    const { result } = renderHook<string, UseMessagesStorage>(() => useMessagesStorage());
    await waitFor(() => null);
    const { getMessages, addMessage, removeMessage } = result.current;
    await act(async () => {
      addMessage('case', 'id-1');
      addMessage('case', 'id-2');
      removeMessage('case', 'id-2');
      expect(getMessages('case')).toEqual(['id-1']);
    });
  });

  it('should return presence of a message', async () => {
    const { result } = renderHook<string, UseMessagesStorage>(() => useMessagesStorage());
    await waitFor(() => null);
    const { hasMessage, addMessage, removeMessage } = result.current;
    await act(async () => {
      addMessage('case', 'id-1');
      addMessage('case', 'id-2');
      removeMessage('case', 'id-2');
      expect(hasMessage('case', 'id-1')).toEqual(true);
      expect(hasMessage('case', 'id-2')).toEqual(false);
    });
  });

  it('should clear all messages', async () => {
    const { result } = renderHook<string, UseMessagesStorage>(() => useMessagesStorage());
    await waitFor(() => null);
    const { getMessages, addMessage, clearAllMessages } = result.current;
    await act(async () => {
      addMessage('case', 'id-1');
      addMessage('case', 'id-2');
      clearAllMessages('case');
    });
    expect(getMessages('case')).toEqual([]);
  });
});
