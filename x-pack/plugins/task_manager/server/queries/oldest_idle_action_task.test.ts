/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';
import { getOldestIdleActionTask } from './oldest_idle_action_task';

describe('getOldestIdleActionTask', () => {
  it('calls client.search with provided index name', async () => {
    const client = elasticsearchServiceMock.createElasticsearchClient();
    await getOldestIdleActionTask(client, '.index-name');
    expect(client.search).toHaveBeenCalled();
    expect(client.search.mock.calls[0][0]?.index).toEqual('.index-name');
  });

  it('returns a default of now-24h when no results', async () => {
    const client = elasticsearchServiceMock.createElasticsearchClient(
      Promise.resolve({ hits: { hits: [], total: 0 } })
    );

    const ts = await getOldestIdleActionTask(client, '.index-name');
    expect(ts).toEqual('now-24h');
  });

  it('returns a default of Date.now-24h when a 404 is returned', async () => {
    const client = elasticsearchServiceMock.createElasticsearchClient(
      Promise.resolve({
        error: { status: 404 },
      })
    );

    const ts = await getOldestIdleActionTask(client, '.index-name');
    expect(ts).toEqual('now-24h');
  });

  it("returns the search result's task.runAt-24h field if it exists", async () => {
    const client = elasticsearchServiceMock.createElasticsearchClient(
      Promise.resolve({
        hits: { hits: [{ _source: { task: { runAt: '2015-01-01T12:10:30Z' } } }], total: 1 },
      })
    );

    const ts = await getOldestIdleActionTask(client, '.index-name');
    expect(ts).toEqual('2015-01-01T12:10:30Z||-24h');
  });

  it("fallsback to 0 if the search result's task.runAt field does not exist", async () => {
    const client1 = elasticsearchServiceMock.createElasticsearchClient(
      Promise.resolve({
        hits: { hits: [{ _source: { task: { runAt: undefined } } }], total: 1 },
      })
    );

    const ts1 = await getOldestIdleActionTask(client1, '.index-name');
    expect(ts1).toEqual('0');

    const client2 = elasticsearchServiceMock.createElasticsearchClient(
      Promise.resolve({
        hits: { hits: [{ _source: { task: undefined } }], total: 1 },
      })
    );

    const ts2 = await getOldestIdleActionTask(client2, '.index-name');
    expect(ts2).toEqual('0');
  });
});
