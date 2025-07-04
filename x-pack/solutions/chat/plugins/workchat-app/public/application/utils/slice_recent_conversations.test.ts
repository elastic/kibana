/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sliceRecentConversations } from './slice_recent_conversations';
import type { ConversationSummary } from '../../../common/conversations';

describe('sliceRecentConversations', () => {
  const createConversation = (id: string, lastUpdated: string): ConversationSummary => ({
    id,
    agentId: `agent-${id}`,
    title: `Conversation ${id}`,
    lastUpdated,
  });

  const conversations: ConversationSummary[] = [
    createConversation('1', '2023-01-01T10:00:00Z'),
    createConversation('2', '2023-01-02T10:00:00Z'),
    createConversation('3', '2023-01-03T10:00:00Z'),
    createConversation('4', '2023-01-04T10:00:00Z'),
    createConversation('5', '2023-01-05T10:00:00Z'),
  ];

  it('should return the most recent conversations based on the limit', () => {
    const result = sliceRecentConversations(conversations, 3);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('5');
    expect(result[1].id).toBe('4');
    expect(result[2].id).toBe('3');
  });

  it('should return all conversations if limit is greater than the number of conversations', () => {
    const result = sliceRecentConversations(conversations, 10);

    expect(result).toHaveLength(5);
    expect(result[0].id).toBe('5');
    expect(result[4].id).toBe('1');
  });

  it('should return conversations in descending order of lastUpdated date', () => {
    const unsortedConversations: ConversationSummary[] = [
      createConversation('3', '2023-01-03T10:00:00Z'),
      createConversation('1', '2023-01-01T10:00:00Z'),
      createConversation('5', '2023-01-05T10:00:00Z'),
      createConversation('2', '2023-01-02T10:00:00Z'),
      createConversation('4', '2023-01-04T10:00:00Z'),
    ];

    const result = sliceRecentConversations(unsortedConversations, 5);

    expect(result).toHaveLength(5);
    expect(result[0].id).toBe('5');
    expect(result[1].id).toBe('4');
    expect(result[2].id).toBe('3');
    expect(result[3].id).toBe('2');
    expect(result[4].id).toBe('1');
  });

  it('should handle conversations with same lastUpdated date', () => {
    const sameTimeConversations: ConversationSummary[] = [
      createConversation('1', '2023-01-01T10:00:00Z'),
      createConversation('2', '2023-01-01T10:00:00Z'),
      createConversation('3', '2023-01-01T10:00:00Z'),
    ];

    const result = sliceRecentConversations(sameTimeConversations, 2);

    expect(result).toHaveLength(2);
  });

  it('should return empty array if conversations is empty', () => {
    const result = sliceRecentConversations([], 3);

    expect(result).toEqual([]);
  });

  it('should return empty array if conversations is undefined', () => {
    const result = sliceRecentConversations(undefined as unknown as ConversationSummary[], 3);

    expect(result).toEqual([]);
  });

  it('should return all conversations if limit is undefined', () => {
    const result = sliceRecentConversations(conversations, undefined as unknown as number);

    expect(result).toEqual(conversations);
  });
});
