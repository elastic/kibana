/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortAndGroupConversations, getDefaultBuckets } from './sort_and_group_conversations';

describe('sortAndGroupConversations', () => {
  const mockConversation = (lastUpdated: string) => ({
    id: 'test-id',
    title: 'Test Conversation',
    lastUpdated,
    messages: [],
    agentId: 'test-agent',
  });

  it('should return empty array when no conversations are provided', () => {
    const result = sortAndGroupConversations([]);
    expect(result).toEqual([]);
  });

  it('should group conversations into correct time buckets', () => {
    // Set now to March 20, 2024 12:00:00 UTC
    const now = new Date('2024-03-20T12:00:00Z');
    const conversations = [
      mockConversation('2024-03-20T10:00:00Z'), // Today (after now/d)
      mockConversation('2024-03-19T10:00:00Z'), // Yesterday (after now-1d/d)
      mockConversation('2024-03-10T10:00:00Z'), // Within 2 weeks (after now/2w)
      mockConversation('2024-02-20T10:00:00Z'), // Within 2 weeks (after now/2w)
    ];

    const result = sortAndGroupConversations(conversations, getDefaultBuckets(), now);
    expect(result).toHaveLength(3);
    expect(result[0].dateLabel).toBe('Today');
    expect(result[0].conversations).toHaveLength(1);
    expect(result[1].dateLabel).toBe('Yesterday');
    expect(result[1].conversations).toHaveLength(1);
    expect(result[2].dateLabel).toBe('Last 2 weeks');
    expect(result[2].conversations).toHaveLength(2);
  });

  it('should sort conversations within each group by date (newest first)', () => {
    const now = new Date('2024-03-20T12:00:00Z');
    const conversations = [
      mockConversation('2024-03-20T08:00:00Z'),
      mockConversation('2024-03-20T10:00:00Z'),
      mockConversation('2024-03-20T09:00:00Z'),
    ];

    const result = sortAndGroupConversations(conversations, getDefaultBuckets(), now);
    expect(result[0].conversations).toHaveLength(3);
    expect(result[0].conversations[0].lastUpdated).toBe('2024-03-20T10:00:00Z');
    expect(result[0].conversations[1].lastUpdated).toBe('2024-03-20T09:00:00Z');
    expect(result[0].conversations[2].lastUpdated).toBe('2024-03-20T08:00:00Z');
  });

  it('should filter out empty groups', () => {
    const now = new Date('2024-03-20T12:00:00Z');
    const conversations = [
      mockConversation('2024-03-20T10:00:00Z'), // Today
      mockConversation('2024-02-20T10:00:00Z'), // Within 2 weeks
    ];

    const result = sortAndGroupConversations(conversations, getDefaultBuckets(), now);
    expect(result).toHaveLength(2);
    expect(result[0].dateLabel).toBe('Today');
    expect(result[1].dateLabel).toBe('Last 2 weeks');
  });

  it('should work with custom bucket definitions', () => {
    const now = new Date('2024-03-20T12:00:00Z');
    const customBuckets = [
      {
        code: 'RECENT',
        label: 'Recent',
        limit: 'now-1h',
      },
      {
        code: 'OLDER',
        label: 'Older',
        limit: false as const,
      },
    ];

    const conversations = [
      mockConversation('2024-03-20T11:30:00Z'), // Recent (within last hour)
      mockConversation('2024-03-20T10:00:00Z'), // Older (more than an hour ago)
    ];

    const result = sortAndGroupConversations(conversations, customBuckets, now);
    expect(result).toHaveLength(2);
    expect(result[0].dateLabel).toBe('Recent');
    expect(result[0].conversations).toHaveLength(1);
    expect(result[1].dateLabel).toBe('Older');
    expect(result[1].conversations).toHaveLength(1);
  });
});
