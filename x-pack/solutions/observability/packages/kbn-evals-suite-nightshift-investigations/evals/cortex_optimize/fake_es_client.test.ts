/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { createCortexPageStore } from '@kbn/nightshift-investigations-plugin/server/cortex/page_store';
import { createFakeEsClient } from './fake_es_client';

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as Logger;

const createStore = (spaceId = 'eval') =>
  createCortexPageStore({
    esClient: createFakeEsClient(),
    logger,
    spaceId,
    destValue: 'eval-cortex',
  });

const page = {
  entityType: 'service' as const,
  slug: 'checkout-api',
  title: 'checkout-api',
  content: '## Overview\nHandles checkout.',
  status: 'tentative' as const,
};

describe('createFakeEsClient behind the real Cortex page store', () => {
  it('writes and reads a page back with its provenance', async () => {
    const store = createStore();

    await store.upsert({ ...page, conversationId: 'conversation-1', roundId: 'round-0' });
    const read = await store.get('cortex_service_checkout-api');

    expect(read).toMatchObject({
      slug: 'checkout-api',
      status: 'tentative',
      conversation_id: 'conversation-1',
      round_id: 'round-0',
      content: page.content,
    });
  });

  it('lists the pages of a space and no other space', async () => {
    const esClient = createFakeEsClient();
    const first = createCortexPageStore({ esClient, logger, spaceId: 'a', destValue: 'idx' });
    const second = createCortexPageStore({ esClient, logger, spaceId: 'b', destValue: 'idx' });

    await first.upsert(page);
    await second.upsert({ ...page, slug: 'orders-consumer', title: 'orders-consumer' });

    expect((await first.list()).pages.map(({ id }) => id)).toEqual(['cortex_service_checkout-api']);
    expect((await second.list()).pages.map(({ id }) => id)).toEqual([
      'cortex_service_orders-consumer',
    ]);
  });

  it('promotes a tentative page after it is corroborated', async () => {
    const store = createStore();
    await store.upsert(page);

    const corroborated = await store.corroborate('cortex_service_checkout-api');

    expect(corroborated).toMatchObject({ corroborations: 1, status: 'established' });
  });

  it('archives a page without deleting it', async () => {
    const store = createStore();
    await store.upsert(page);

    await store.archive('cortex_service_checkout-api');

    expect((await store.list()).pages).toEqual([
      expect.objectContaining({ id: 'cortex_service_checkout-api', status: 'archived' }),
    ]);
  });

  it('refuses to create a page that already exists', async () => {
    const store = createStore();

    expect(await store.create(page)).toBeDefined();
    expect(await store.create(page)).toBeUndefined();
  });

  it('returns undefined for a page that does not exist', async () => {
    expect(await createStore().get('cortex_service_missing')).toBeUndefined();
  });
});
