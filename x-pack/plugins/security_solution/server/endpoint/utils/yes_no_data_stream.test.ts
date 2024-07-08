/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { doesLogsEndpointActionsIndexExist } from './yes_no_data_stream';

describe('Accurately answers if index exists', () => {
  let esClient: ElasticsearchClientMock;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
  });

  it('Returns FALSE for a non-existent index', async () => {
    esClient.indices.exists.mockResponseImplementation(() => ({
      body: false,
      statusCode: 404,
    }));
    const doesItExist = await doesLogsEndpointActionsIndexExist({
      esClient,
      logger: loggingSystemMock.create().get('host-isolation'),
      indexName: '.test-index.name-default',
    });
    expect(doesItExist).toBeFalsy();
  });

  it('Returns TRUE for an existing index', async () => {
    esClient.indices.exists.mockResponseImplementation(() => ({
      body: true,
      statusCode: 200,
    }));
    const doesItExist = await doesLogsEndpointActionsIndexExist({
      esClient,
      logger: loggingSystemMock.create().get('host-isolation'),
      indexName: '.test-index.name-default',
    });
    expect(doesItExist).toBeTruthy();
  });
});
