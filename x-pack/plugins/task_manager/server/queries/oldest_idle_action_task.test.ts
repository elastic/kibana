/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';
import { getOldestIdleActionTask } from './oldest_idle_action_task';

describe('getOldestIdleActionTask', () => {
  beforeAll(() => {
    jest.spyOn(Date, 'now').mockReturnValue(112233);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('calls client.search with provided index name', async () => {
    const client = elasticsearchServiceMock.createElasticsearchClient();
    await getOldestIdleActionTask(client, '.index-name');
    expect(client.search).toHaveBeenCalled();
    expect(client.search.mock.calls[0][0]?.index).toEqual('.index-name');
  });

  it('returns a default of Date.now when no results', async () => {
    const client = elasticsearchServiceMock.createElasticsearchClient(
      elasticsearchServiceMock.createSuccessTransportRequestPromise({
        body: { hits: { hits: [], total: 0 } },
      })
    );

    const ts = await getOldestIdleActionTask(client, '.index-name');
    expect(ts).toEqual(112233);
  });

  it('returns a default of Date.now when a 404 is returned', async () => {
    const client = elasticsearchServiceMock.createElasticsearchClient(
      elasticsearchServiceMock.createSuccessTransportRequestPromise({
        error: { status: 404 },
      })
    );

    const ts = await getOldestIdleActionTask(client, '.index-name');
    expect(ts).toEqual(112233);
  });

  it("returns the search result's task.runAt field if it exists", async () => {
    const client = elasticsearchServiceMock.createElasticsearchClient(
      elasticsearchServiceMock.createSuccessTransportRequestPromise({
        hits: { hits: [{ _source: { task: { runAt: '2015-01-01T12:10:30Z' } } }], total: 1 },
      })
    );

    const ts = await getOldestIdleActionTask(client, '.index-name');
    expect(ts).toEqual('2015-01-01T12:10:30Z');
  });

  it("fallsback to Date.now if the search result's task.runAt field does not exist", async () => {
    const client = elasticsearchServiceMock.createElasticsearchClient(
      elasticsearchServiceMock.createSuccessTransportRequestPromise({
        hits: { hits: [{ _source: { task: { runAt: undefined } } }], total: 1 },
      })
    );

    const ts = await getOldestIdleActionTask(client, '.index-name');
    expect(ts).toEqual(112233);
  });
});
