/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEsContext } from './context';
import { Logger } from '@kbn/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createReadySignal } from '../lib/ready_signal';
import { GetDataStreamsResponse } from './cluster_client_adapter.test';

jest.mock('../../../../package.json', () => ({ version: '1.2.3' }));
jest.mock('./init');
jest.mock('../lib/ready_signal', () => {
  const createReadySignalActual = jest.requireActual('../lib/ready_signal');
  return {
    createReadySignal: jest.fn(createReadySignalActual.createReadySignal),
  };
});

const mockCreateReadySignal = createReadySignal as jest.MockedFunction<typeof createReadySignal>;

let logger: Logger;
let elasticsearchClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

beforeEach(() => {
  logger = loggingSystemMock.createLogger();
  elasticsearchClient = elasticsearchServiceMock.createElasticsearchClient();
});

describe('createEsContext', () => {
  test('should return is ready state as falsy if not initialized', () => {
    const context = createEsContext({
      logger,
      shouldSetExistingAssetsToHidden: true,
      indexNameRoot: 'test0',
      elasticsearchClientPromise: Promise.resolve(elasticsearchClient),
    });

    expect(context.initialized).toBeFalsy();

    context.initialize();
    expect(context.initialized).toBeTruthy();
  });

  test('should return esNames', () => {
    const context = createEsContext({
      logger,
      shouldSetExistingAssetsToHidden: true,
      indexNameRoot: 'test-index',
      elasticsearchClientPromise: Promise.resolve(elasticsearchClient),
    });

    const esNames = context.esNames;
    expect(esNames).toStrictEqual({
      base: 'test-index',
      dataStream: 'test-index-event-log-ds',
      indexPattern: 'test-index-event-log-*',
      indexTemplate: 'test-index-event-log-template',
    });
  });

  test('should return exist false for esAdapter index template and data stream before initialize', async () => {
    const context = createEsContext({
      logger,
      shouldSetExistingAssetsToHidden: true,
      indexNameRoot: 'test1',
      elasticsearchClientPromise: Promise.resolve(elasticsearchClient),
    });

    elasticsearchClient.indices.existsTemplate.mockResponse(false);
    elasticsearchClient.indices.existsIndexTemplate.mockResponse(false);
    elasticsearchClient.indices.existsAlias.mockResponse(false);
    elasticsearchClient.indices.getDataStream.mockResponse({ data_streams: [] });
    const doesAliasExist = await context.esAdapter.doesDataStreamExist(context.esNames.dataStream);
    expect(doesAliasExist).toBeFalsy();

    const doesIndexTemplateExist = await context.esAdapter.doesIndexTemplateExist(
      context.esNames.indexTemplate
    );
    expect(doesIndexTemplateExist).toBeFalsy();
  });

  test('should return exist true for esAdapter index template and data stream after initialize', async () => {
    const context = createEsContext({
      logger,
      shouldSetExistingAssetsToHidden: true,
      indexNameRoot: 'test2',
      elasticsearchClientPromise: Promise.resolve(elasticsearchClient),
    });
    elasticsearchClient.indices.existsTemplate.mockResponse(true);
    context.initialize();

    elasticsearchClient.indices.getDataStream.mockResolvedValue(GetDataStreamsResponse);
    const doesDataStreamExist = await context.esAdapter.doesDataStreamExist(
      context.esNames.dataStream
    );
    expect(doesDataStreamExist).toBeTruthy();

    const doesIndexTemplateExist = await context.esAdapter.doesIndexTemplateExist(
      context.esNames.indexTemplate
    );
    expect(doesIndexTemplateExist).toBeTruthy();
  });

  test('should cancel initialization in case of server shutdown', async () => {
    const readySignal = createReadySignal();

    const wait = jest.fn(() => readySignal.wait());
    const signal = jest.fn((value) => readySignal.signal(value));
    const isEmitted = jest.fn(() => readySignal.isEmitted());
    const createReadySignalMock = jest.fn(() => ({ wait, signal, isEmitted }));
    mockCreateReadySignal.mockReset();
    mockCreateReadySignal.mockImplementation(createReadySignalMock);

    const context = createEsContext({
      logger,
      shouldSetExistingAssetsToHidden: true,
      indexNameRoot: 'test2',
      elasticsearchClientPromise: Promise.resolve(elasticsearchClient),
    });
    expect(mockCreateReadySignal).toBeCalledTimes(1);
    elasticsearchClient.indices.existsTemplate.mockResponse(true);
    expect(signal).toBeCalledTimes(0);
    context.initialize();
    await context.shutdown();
    expect(signal).toBeCalledTimes(1);
    expect(signal).toBeCalledWith(false);
  });

  test('should handled failed initialization', async () => {
    jest.requireMock('./init').initializeEs.mockResolvedValue(false);
    const context = createEsContext({
      logger,
      shouldSetExistingAssetsToHidden: true,
      indexNameRoot: 'test2',
      elasticsearchClientPromise: Promise.resolve(elasticsearchClient),
    });
    context.initialize();
    const success = await context.waitTillReady();
    expect(success).toBe(false);
  });
});
