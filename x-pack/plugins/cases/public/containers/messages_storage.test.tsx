/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessagesStorage } from './messages_storage';

describe('useLocalStorage', () => {
  const storage = new MessagesStorage();
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('should return an empty array when there is no messages', async () => {
    const { getMessages } = storage;
    expect(getMessages('case')).toEqual([]);
  });

  it('should add a message', async () => {
    const { getMessages, addMessage } = storage;
    addMessage('case', 'id-1');
    expect(getMessages('case')).toEqual(['id-1']);
  });

  it('should add multiple messages', async () => {
    const { getMessages, addMessage } = storage;
    addMessage('case', 'id-1');
    addMessage('case', 'id-2');
    expect(getMessages('case')).toEqual(['id-1', 'id-2']);
  });

  it('should remove a message', async () => {
    const { getMessages, addMessage, removeMessage } = storage;
    addMessage('case', 'id-1');
    addMessage('case', 'id-2');
    removeMessage('case', 'id-2');
    expect(getMessages('case')).toEqual(['id-1']);
  });

  it('should return presence of a message', async () => {
    const { hasMessage, addMessage, removeMessage } = storage;
    addMessage('case', 'id-1');
    addMessage('case', 'id-2');
    removeMessage('case', 'id-2');
    expect(hasMessage('case', 'id-1')).toEqual(true);
    expect(hasMessage('case', 'id-2')).toEqual(false);
  });

  it('should clear all messages', async () => {
    const { getMessages, addMessage, clearAllMessages } = storage;
    addMessage('case', 'id-1');
    addMessage('case', 'id-2');
    clearAllMessages('case');
    expect(getMessages('case')).toEqual([]);
  });
});
