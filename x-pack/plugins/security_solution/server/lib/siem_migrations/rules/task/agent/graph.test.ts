/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceClient } from '@kbn/inference-plugin/server';
import type {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';
import { loggerMock } from '@kbn/logging-mocks';
import { FakeLLM } from '@langchain/core/utils/testing';
import type { IntegrationRetriever } from '../util/integration_retriever';
import type { PrebuiltRulesMapByName } from '../util/prebuilt_rules';
import type { RuleResourceRetriever } from '../util/rule_resource_retriever';
import { getRuleMigrationAgent } from './graph';

describe('getRuleMigrationAgent', () => {
  const model = new FakeLLM({
    response: JSON.stringify({}, null, 2),
  }) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

  const inferenceClient = {} as InferenceClient;
  const connectorId = 'draw_graphs';
  const prebuiltRulesMap = {} as PrebuiltRulesMapByName;
  const resourceRetriever = {} as RuleResourceRetriever;
  const integrationRetriever = {} as IntegrationRetriever;
  const logger = loggerMock.create();

  it('Ensures that the graph compiles', async () => {
    try {
      await getRuleMigrationAgent({
        model,
        inferenceClient,
        prebuiltRulesMap,
        resourceRetriever,
        integrationRetriever,
        connectorId,
        logger,
      });
    } catch (error) {
      throw Error(`getRuleMigrationAgent threw an error: ${error}`);
    }
  });
});
