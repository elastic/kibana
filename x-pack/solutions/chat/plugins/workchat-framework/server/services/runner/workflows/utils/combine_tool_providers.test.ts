/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Tool } from '@kbn/wc-framework-types-server';
import { createToolProvider } from '@kbn/wc-framework-types-server';
import { combineToolProviders } from './combine_tool_providers';

const createTool = (toolId: string): Tool => {
  return {
    id: toolId,
    name: toolId,
    description: `tool ${toolId}`,
    schema: {},
    handler: jest.fn(),
  };
};

describe('combineToolProviders', () => {
  const tool1 = createTool('tool1');
  const tool2 = createTool('tool2');
  const tool3 = createTool('tool3');
  const tool4Dupe = createTool('tool1'); // Same ID as tool1

  const provider1 = createToolProvider([tool1, tool2]);
  const provider2 = createToolProvider([tool3, tool4Dupe]);
  const provider3 = createToolProvider([]);

  it('should return true from has() if tool exists in any provider', async () => {
    const combinedProvider = combineToolProviders(provider1, provider2);
    expect(await combinedProvider.has('tool1')).toBe(true);
    expect(await combinedProvider.has('tool2')).toBe(true);
    expect(await combinedProvider.has('tool3')).toBe(true);
  });

  it('should return false from has() if tool does not exist in any provider', async () => {
    const combinedProvider = combineToolProviders(provider1, provider2);
    expect(await combinedProvider.has('nonexistent')).toBe(false);
  });

  it('should return the tool from get() if it exists (first provider priority)', async () => {
    const combinedProvider = combineToolProviders(provider1, provider2);
    expect(await combinedProvider.get('tool1')).toBe(tool1);
    expect(await combinedProvider.get('tool2')).toBe(tool2);
    expect(await combinedProvider.get('tool3')).toBe(tool3);
    // tool4Dupe has the same id as tool1, but provider1 comes first
    expect(await combinedProvider.get('tool1')).not.toBe(tool4Dupe);
  });

  it('should throw from get() if tool does not exist', async () => {
    const combinedProvider = combineToolProviders(provider1, provider2);
    await expect(combinedProvider.get('nonexistent')).rejects.toThrow(
      'Tool with id nonexistent not found'
    );
  });

  it('should return all unique tools from getAll() (first provider priority)', async () => {
    const combinedProvider = combineToolProviders(provider1, provider2);
    const allTools = await combinedProvider.getAll();
    expect(allTools).toHaveLength(3);
    expect(allTools).toContain(tool1);
    expect(allTools).toContain(tool2);
    expect(allTools).toContain(tool3);
    expect(allTools).not.toContain(tool4Dupe); // tool1 should be present instead
  });

  it('should handle combining with an empty provider', async () => {
    const combinedProvider = combineToolProviders(provider1, provider3);
    expect(await combinedProvider.has('tool1')).toBe(true);
    expect(await combinedProvider.has('tool2')).toBe(true);
    expect(await combinedProvider.has('tool3')).toBe(false);
    expect(await combinedProvider.get('tool1')).toBe(tool1);
    const allTools = await combinedProvider.getAll();
    expect(allTools).toHaveLength(2);
    expect(allTools).toContain(tool1);
    expect(allTools).toContain(tool2);
  });

  it('should handle combining only empty providers', async () => {
    const combinedProvider = combineToolProviders(provider3, provider3);
    expect(await combinedProvider.has('tool1')).toBe(false);
    await expect(combinedProvider.get('tool1')).rejects.toThrow();
    expect(await combinedProvider.getAll()).toEqual([]);
  });

  it('should handle combining no providers', async () => {
    const combinedProvider = combineToolProviders();
    expect(await combinedProvider.has('tool1')).toBe(false);
    await expect(combinedProvider.get('tool1')).rejects.toThrow();
    expect(await combinedProvider.getAll()).toEqual([]);
  });
});
