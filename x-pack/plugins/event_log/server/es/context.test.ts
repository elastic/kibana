/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createEsContext } from './context';
import { ElasticsearchClient, Logger } from '../../../../../src/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '../../../../../src/core/server/mocks';
import { DeeplyMockedKeys } from '@kbn/utility-types/jest';
import { RequestEvent } from '@elastic/elasticsearch';
jest.mock('../lib/../../../../package.json', () => ({ version: '1.2.3' }));
jest.mock('./init');

let logger: Logger;
let elasticsearchClient: DeeplyMockedKeys<ElasticsearchClient>;

beforeEach(() => {
  logger = loggingSystemMock.createLogger();
  elasticsearchClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
});

describe('createEsContext', () => {
  test('should return is ready state as falsy if not initialized', () => {
    const context = createEsContext({
      logger,
      indexNameRoot: 'test0',
      kibanaVersion: '1.2.3',
      elasticsearchClientPromise: Promise.resolve(elasticsearchClient),
    });

    expect(context.initialized).toBeFalsy();

    context.initialize();
    expect(context.initialized).toBeTruthy();
  });

  test('should return esNames', () => {
    const context = createEsContext({
      logger,
      indexNameRoot: 'test-index',
      kibanaVersion: '1.2.3',
      elasticsearchClientPromise: Promise.resolve(elasticsearchClient),
    });

    const esNames = context.esNames;
    expect(esNames).toStrictEqual({
      base: 'test-index',
      alias: 'test-index-event-log-1.2.3',
      ilmPolicy: 'test-index-event-log-policy',
      indexPattern: 'test-index-event-log-*',
      indexPatternWithVersion: 'test-index-event-log-1.2.3-*',
      indexTemplate: 'test-index-event-log-1.2.3-template',
      initialIndex: 'test-index-event-log-1.2.3-000001',
    });
  });

  test('should return exist false for esAdapter ilm policy, index template and alias before initialize', async () => {
    const context = createEsContext({
      logger,
      indexNameRoot: 'test1',
      kibanaVersion: '1.2.3',
      elasticsearchClientPromise: Promise.resolve(elasticsearchClient),
    });
    elasticsearchClient.indices.existsTemplate.mockResolvedValue(asApiResponse(false));
    elasticsearchClient.indices.existsAlias.mockResolvedValue(asApiResponse(false));
    const doesAliasExist = await context.esAdapter.doesAliasExist(context.esNames.alias);
    expect(doesAliasExist).toBeFalsy();

    const doesIndexTemplateExist = await context.esAdapter.doesIndexTemplateExist(
      context.esNames.indexTemplate
    );
    expect(doesIndexTemplateExist).toBeFalsy();
  });

  test('should return exist true for esAdapter ilm policy, index template and alias after initialize', async () => {
    const context = createEsContext({
      logger,
      indexNameRoot: 'test2',
      kibanaVersion: '1.2.3',
      elasticsearchClientPromise: Promise.resolve(elasticsearchClient),
    });
    elasticsearchClient.indices.existsTemplate.mockResolvedValue(asApiResponse(true));
    context.initialize();

    const doesIlmPolicyExist = await context.esAdapter.doesIlmPolicyExist(
      context.esNames.ilmPolicy
    );
    expect(doesIlmPolicyExist).toBeTruthy();

    const doesAliasExist = await context.esAdapter.doesAliasExist(context.esNames.alias);
    expect(doesAliasExist).toBeTruthy();

    const doesIndexTemplateExist = await context.esAdapter.doesIndexTemplateExist(
      context.esNames.indexTemplate
    );
    expect(doesIndexTemplateExist).toBeTruthy();
  });

  test('should handled failed initialization', async () => {
    jest.requireMock('./init').initializeEs.mockResolvedValue(false);
    const context = createEsContext({
      logger,
      indexNameRoot: 'test2',
      kibanaVersion: '1.2.3',
      elasticsearchClientPromise: Promise.resolve(elasticsearchClient),
    });
    context.initialize();
    const success = await context.waitTillReady();
    expect(success).toBe(false);
  });
});

function asApiResponse<T>(body: T): RequestEvent<T> {
  return {
    body,
  } as RequestEvent<T>;
}
