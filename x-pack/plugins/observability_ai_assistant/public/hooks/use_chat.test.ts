/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useChat } from './use_chat';

describe('useChat', () => {
  // Tests for initial hook setup and default states

  describe('initially', () => {
    it('returns the initial messages including the system message', () => {});
    it('sets chatState to ready', () => {});
  });

  describe('when calling next()', () => {
    it('sets the chatState to loading', () => {});

    describe('after a partial response it updates the returned messages', () => {});

    describe('after a completed response it updates the returned messages and the loading state', () => {});

    describe('after aborting a response it shows the partial message and sets chatState to aborted', () => {});

    describe('after a response errors out, it shows the partial message and sets chatState to error', () => {});
  });

  // Tests for the 'next' function behavior
  describe('Function next', () => {
    it('should handle empty message array correctly', () => {});
    it('should ignore non-user and non-assistant messages with function requests', () => {});
    it('should set chat state to loading on valid next message', () => {});
    it('should handle abort signal correctly during message processing', () => {});
    it('should handle message processing for assistant messages with function request', () => {});
    it('should handle message processing for user messages', () => {});
    it('should handle observable responses correctly', () => {});
    it('should update messages correctly after response', () => {});
    it('should handle errors during message processing', () => {});
  });

  // Tests for the 'stop' function behavior
  describe('Function stop', () => {
    it('should abort current operation when stop is called', () => {});
  });

  // Tests for the state management within the hook
  describe('State management', () => {
    it('should update chat state correctly', () => {});
    it('should update messages state correctly', () => {});
    it('should handle pending message state correctly', () => {});
  });

  // Tests for cleanup and unmounting behavior
  describe('Cleanup and unmounting behavior', () => {
    it('should abort any ongoing process on unmount', () => {});
  });
});
