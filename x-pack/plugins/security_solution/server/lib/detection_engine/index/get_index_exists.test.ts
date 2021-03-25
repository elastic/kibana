/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';
import { getIndexExists } from './get_index_exists';

class StatusCode extends Error {
  status: number = -1;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

describe('get_index_exists', () => {
  test('it should return a true if you have _shards', async () => {
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockReturnValue(
      // @ts-expect-error not full interface
      elasticsearchClientMock.createSuccessTransportRequestPromise({ _shards: { total: 1 } })
    );
    const indexExists = await getIndexExists(esClient, 'some-index');
    expect(indexExists).toEqual(true);
  });

  test('it should return a false if you do NOT have _shards', async () => {
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockReturnValue(
      // @ts-expect-error not full interface
      elasticsearchClientMock.createSuccessTransportRequestPromise({ _shards: { total: 0 } })
    );
    const indexExists = await getIndexExists(esClient, 'some-index');
    expect(indexExists).toEqual(false);
  });

  test('it should return a false if it encounters a 404', async () => {
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockReturnValue(
      elasticsearchClientMock.createErrorTransportRequestPromise({
        body: new StatusCode(404, 'I am a 404 error'),
      })
    );
    const indexExists = await getIndexExists(esClient, 'some-index');
    expect(indexExists).toEqual(false);
  });

  test('it should reject if it encounters a non 404', async () => {
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockReturnValue(
      elasticsearchClientMock.createErrorTransportRequestPromise(
        new StatusCode(500, 'I am a 500 error')
      )
    );
    await expect(getIndexExists(esClient, 'some-index')).rejects.toThrow('I am a 500 error');
  });
});
