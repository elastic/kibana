/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent } from '../../../../types';

import { getCommonTags } from './get_common_tags';

describe('getCommonTags', () => {
  it('should return common tags from allAgents if agents is empty string', () => {
    const result = getCommonTags('', [{ tags: ['tag1'] }, { tags: ['tag1', 'tag2'] }] as Agent[]);

    expect(result).toEqual(['tag1']);
  });

  it('should return common tags from allAgents if agents is query', () => {
    const result = getCommonTags('query', [
      { tags: ['tag1'] },
      { tags: ['tag1', 'tag2'] },
    ] as Agent[]);

    expect(result).toEqual(['tag1']);
  });

  it('should return empty common tags if allAgents not set', () => {
    const result = getCommonTags('');

    expect(result).toEqual([]);
  });

  it('should return common tags from fresh data if agents is selected agent list', () => {
    const result = getCommonTags(
      [
        { id: 'agent1', tags: ['oldTag'] },
        { id: 'agent2', tags: ['oldTag'] },
      ] as Agent[],
      [
        { id: 'agent1', tags: ['oldTag', 'tag1'] },
        { id: 'agent2', tags: ['oldTag', 'tag1'] },
      ] as Agent[]
    );

    expect(result).toEqual(['oldTag', 'tag1']);
  });

  it('should return common tags from old data if allAgents not set', () => {
    const result = getCommonTags([
      { id: 'agent1', tags: ['oldTag'] },
      { id: 'agent2', tags: ['oldTag'] },
    ] as Agent[]);

    expect(result).toEqual(['oldTag']);
  });

  it('should return empty common tags if one agent has no tags set', () => {
    const result = getCommonTags([{ id: 'agent1', tags: ['oldTag'] }, { id: 'agent2' }] as Agent[]);

    expect(result).toEqual([]);
  });
});
