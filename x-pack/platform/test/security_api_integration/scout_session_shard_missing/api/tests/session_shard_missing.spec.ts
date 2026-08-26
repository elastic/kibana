/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, apiTest as test } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

const KBN_XSRF = 'xxx';

async function clearAllSessions(
  apiClient: any,
  config: { auth: { username: string; password: string } }
): Promise<void> {
  const adminBase64 = Buffer.from(`${config.auth.username}:${config.auth.password}`).toString(
    'base64'
  );
  await apiClient
    .post('/api/security/session/_invalidate', {
      headers: { 'kbn-xsrf': KBN_XSRF, Authorization: `Basic ${adminBase64}` },
      body: { match: 'all' },
    })
    .catch(() => {});
}

async function getSessionCount(esClient: any): Promise<number> {
  await esClient.indices
    .refresh({ index: '.kibana_security_session*', ignore_unavailable: true })
    .catch(() => {});
  const result = await esClient.search({
    index: '.kibana_security_session*',
    ignore_unavailable: true,
  });
  return (result.hits.total as { value: number }).value;
}

test.describe('Session index shard missing', { tag: [...tags.stateful.classic] }, () => {
  test.beforeEach(async ({ apiClient, config, esClient }) => {
    await esClient.cluster.health({
      index: '.kibana_security_session*',
      wait_for_status: 'green',
      ignore_unavailable: true,
    } as any);
    await esClient.cluster.putSettings({
      body: { persistent: { 'logger.org.elasticsearch.xpack.security.authc': 'debug' } },
    } as any);
    await clearAllSessions(apiClient, config);
  });

  test.afterEach(async ({ apiClient, config }) => {
    await simulatePointInTimeFailure(apiClient, config, false);
  });

  test('quietly fails if shards are unavailable', async ({ apiClient, config, esClient }) => {
    test.setTimeout(100000);

    await resetCleanupTask(apiClient, config, esClient);
    await simulatePointInTimeFailure(apiClient, config, true);

    const loginResponse = await apiClient.post('/internal/security/login', {
      headers: { 'kbn-xsrf': KBN_XSRF },
      body: {
        providerType: 'basic',
        providerName: 'basic1',
        currentURL: '/',
        params: { username: config.auth.username, password: config.auth.password },
      },
    });
    expect(loginResponse).toHaveStatusCode(200);

    await runCleanupTask(apiClient, config);

    await new Promise((r) => setTimeout(r, 5000));

    // Session should remain since cleanup couldn't run (shard missing)
    const count = await getSessionCount(esClient);
    expect(count).toBe(1);

    await simulatePointInTimeFailure(apiClient, config, false);
  });

  test('fails if shards are unavailable more than 10 times', async ({
    apiClient,
    config,
    esClient,
  }) => {
    test.setTimeout(600000);

    await resetCleanupTask(apiClient, config, esClient);
    await simulatePointInTimeFailure(apiClient, config, true);

    await apiClient.post('/internal/security/login', {
      headers: { 'kbn-xsrf': KBN_XSRF },
      body: {
        providerType: 'basic',
        providerName: 'basic1',
        currentURL: '/',
        params: { username: config.auth.username, password: config.auth.password },
      },
    });

    let shardMissingCounter = 0;
    while (shardMissingCounter < 9) {
      const currentCounter = shardMissingCounter;
      await runCleanupTask(apiClient, config);

      while (shardMissingCounter <= currentCounter) {
        await new Promise((r) => setTimeout(r, 5000));
        const state = await getCleanupTaskStatus(apiClient);
        shardMissingCounter = state.shardMissingCounter ?? 0;
      }
    }

    if (shardMissingCounter === 9) {
      await runCleanupTask(apiClient, config);
      await new Promise((r) => setTimeout(r, 5000));
      const state = await getCleanupTaskStatus(apiClient);
      expect(state.shardMissingCounter).toBe(0);
    }

    await simulatePointInTimeFailure(apiClient, config, false);
  });
});

async function runCleanupTask(
  apiClient: any,
  config: { auth: { username: string; password: string } }
): Promise<void> {
  const authBase64 = Buffer.from(`${config.auth.username}:${config.auth.password}`).toString(
    'base64'
  );
  await apiClient.post('/session/_run_cleanup', {
    headers: { 'kbn-xsrf': KBN_XSRF, Authorization: `Basic ${authBase64}` },
  });
}

async function simulatePointInTimeFailure(
  apiClient: any,
  config: { auth: { username: string; password: string } },
  simulate: boolean
): Promise<void> {
  const authBase64 = Buffer.from(`${config.auth.username}:${config.auth.password}`).toString(
    'base64'
  );
  const response = await apiClient.post('/simulate_point_in_time_failure', {
    headers: { 'kbn-xsrf': KBN_XSRF, Authorization: `Basic ${authBase64}` },
    body: { simulateOpenPointInTimeFailure: simulate },
  });
  expect(response).toHaveStatusCode(200);
}

async function getCleanupTaskStatus(apiClient: any): Promise<{ shardMissingCounter?: number }> {
  const response = await apiClient.get('/cleanup_task_status');
  expect(response).toHaveStatusCode(200);
  return response.body.state;
}

async function resetCleanupTask(
  apiClient: any,
  config: { auth: { username: string; password: string } },
  esClient: any
): Promise<void> {
  let shardMissingCounter = -1;
  while (shardMissingCounter !== 0) {
    await runCleanupTask(apiClient, config);
    await new Promise((r) => setTimeout(r, 5000));
    const state = await getCleanupTaskStatus(apiClient);
    shardMissingCounter = state.shardMissingCounter ?? 0;
  }
  await simulatePointInTimeFailure(apiClient, config, false);
}
