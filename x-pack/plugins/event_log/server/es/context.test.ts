/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createEsContext } from './context';
import { LegacyClusterClient, Logger } from '../../../../../src/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from '../../../../../src/core/server/mocks';
jest.mock('../lib/../../../../package.json', () => ({
  version: '1.2.3',
}));
type EsClusterClient = Pick<jest.Mocked<LegacyClusterClient>, 'callAsInternalUser' | 'asScoped'>;

let logger: Logger;
let clusterClient: EsClusterClient;

beforeEach(() => {
  logger = loggingSystemMock.createLogger();
  clusterClient = elasticsearchServiceMock.createLegacyClusterClient();
});

describe('createEsContext', () => {
  test('should return is ready state as falsy if not initialized', () => {
    const context = createEsContext({
      logger,
      clusterClientPromise: Promise.resolve(clusterClient),
      indexNameRoot: 'test0',
    });

    expect(context.initialized).toBeFalsy();

    context.initialize();
    expect(context.initialized).toBeTruthy();
  });

  test('should return esNames', () => {
    const context = createEsContext({
      logger,
      clusterClientPromise: Promise.resolve(clusterClient),
      indexNameRoot: 'test-index',
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
      clusterClientPromise: Promise.resolve(clusterClient),
      indexNameRoot: 'test1',
    });
    clusterClient.callAsInternalUser.mockResolvedValue(false);

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
      clusterClientPromise: Promise.resolve(clusterClient),
      indexNameRoot: 'test2',
    });
    clusterClient.callAsInternalUser.mockResolvedValue(true);
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
});
