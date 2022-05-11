/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  coreMock,
  elasticsearchServiceMock,
  savedObjectsClientMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { SecuritySolutionRequestHandlerContext } from '../../types';
import { createRouteHandlerContext } from '../mocks';
import {
  doLogsEndpointActionDsExists,
  doesLogsEndpointActionsIndexExist,
} from './yes_no_data_stream';

describe('Accurately answers if index template for data stream exists', () => {
  let ctxt: ReturnType<typeof createRouteHandlerContext>;

  beforeEach(() => {
    ctxt = createRouteHandlerContext(
      elasticsearchServiceMock.createScopedClusterClient(),
      savedObjectsClientMock.create()
    );
  });

  it('Returns FALSE for a non-existent data stream index template', async () => {
    ctxt.core.elasticsearch.client.asInternalUser.indices.existsIndexTemplate.mockResponseImplementation(
      () => ({
        body: false,
        statusCode: 404,
      })
    );
    const doesItExist = await doLogsEndpointActionDsExists({
      context: coreMock.createCustomRequestHandlerContext(
        ctxt
      ) as SecuritySolutionRequestHandlerContext,
      logger: loggingSystemMock.create().get('host-isolation'),
      dataStreamName: '.test-stream.name',
    });
    expect(doesItExist).toBeFalsy();
  });

  it('Returns TRUE for an existing index', async () => {
    ctxt.core.elasticsearch.client.asInternalUser.indices.existsIndexTemplate.mockResponseImplementation(
      () => ({
        body: true,
        statusCode: 200,
      })
    );
    const doesItExist = await doLogsEndpointActionDsExists({
      context: coreMock.createCustomRequestHandlerContext(
        ctxt
      ) as SecuritySolutionRequestHandlerContext,
      logger: loggingSystemMock.create().get('host-isolation'),
      dataStreamName: '.test-stream.name',
    });
    expect(doesItExist).toBeTruthy();
  });
});

describe('Accurately answers if index exists', () => {
  let ctxt: ReturnType<typeof createRouteHandlerContext>;

  beforeEach(() => {
    ctxt = createRouteHandlerContext(
      elasticsearchServiceMock.createScopedClusterClient(),
      savedObjectsClientMock.create()
    );
  });

  it('Returns FALSE for a non-existent index', async () => {
    ctxt.core.elasticsearch.client.asInternalUser.indices.exists.mockResponseImplementation(() => ({
      body: false,
      statusCode: 404,
    }));
    const doesItExist = await doesLogsEndpointActionsIndexExist({
      context: coreMock.createCustomRequestHandlerContext(
        ctxt
      ) as SecuritySolutionRequestHandlerContext,
      logger: loggingSystemMock.create().get('host-isolation'),
      indexName: '.test-index.name-default',
    });
    expect(doesItExist).toBeFalsy();
  });

  it('Returns TRUE for an existing index', async () => {
    ctxt.core.elasticsearch.client.asInternalUser.indices.exists.mockResponseImplementation(() => ({
      body: true,
      statusCode: 200,
    }));
    const doesItExist = await doesLogsEndpointActionsIndexExist({
      context: coreMock.createCustomRequestHandlerContext(
        ctxt
      ) as SecuritySolutionRequestHandlerContext,
      logger: loggingSystemMock.create().get('host-isolation'),
      indexName: '.test-index.name-default',
    });
    expect(doesItExist).toBeTruthy();
  });
});
