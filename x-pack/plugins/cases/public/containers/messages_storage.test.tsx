/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  addMessage,
  clearAllMessages,
  hasMessage,
  getMessages,
  removeMessage,
} from './messages_storage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('should return an empty array when there is no messages', async () => {
    expect(getMessages()).toEqual([]);
  });

  it('should add a message', async () => {
    addMessage('id-1');
    expect(getMessages()).toEqual(['id-1']);
  });

  it('should add multiple messages', async () => {
    addMessage('id-1');
    addMessage('id-2');
    expect(getMessages()).toEqual(['id-1', 'id-2']);
  });

  it('should remove a message', async () => {
    addMessage('id-1');
    addMessage('id-2');
    removeMessage('id-2');
    expect(getMessages()).toEqual(['id-1']);
  });

  it('should return presence of a message', async () => {
    addMessage('id-1');
    addMessage('id-2');
    removeMessage('id-2');
    expect(hasMessage('id-1')).toEqual(true);
    expect(hasMessage('id-2')).toEqual(false);
  });

  it('should clear all messages', async () => {
    addMessage('id-1');
    addMessage('id-2');
    clearAllMessages();
    expect(getMessages()).toEqual([]);
  });
});
