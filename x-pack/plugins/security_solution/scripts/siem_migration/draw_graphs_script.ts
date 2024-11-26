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
import type { Logger } from '@kbn/logging';
import { ToolingLog } from '@kbn/tooling-log';
import { FakeLLM } from '@langchain/core/utils/testing';
import fs from 'fs/promises';
import path from 'path';
import { getRuleMigrationAgent } from '../../server/lib/siem_migrations/rules/task/agent';
import { getTranslateRuleGraph } from '../../server/lib/siem_migrations/rules/task/agent/sub_graphs/translate_rule';
import type { IntegrationRetriever } from '../../server/lib/siem_migrations/rules/task/util/integration_retriever';
import type { PrebuiltRulesMapByName } from '../../server/lib/siem_migrations/rules/task/util/prebuilt_rules';
import type { RuleResourceRetriever } from '../../server/lib/siem_migrations/rules/task/util/rule_resource_retriever';

interface Drawable {
  drawMermaidPng: () => Promise<Blob>;
}

const mockLlm = new FakeLLM({
  response: JSON.stringify({}, null, 2),
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

const inferenceClient = {} as InferenceClient;
const connectorId = 'draw_graphs';
const prebuiltRulesMap = {} as PrebuiltRulesMapByName;
const resourceRetriever = {} as RuleResourceRetriever;
const integrationRetriever = {} as IntegrationRetriever;

const createLlmInstance = () => {
  return mockLlm;
};

async function getAgentGraph(logger: Logger): Promise<Drawable> {
  const model = createLlmInstance();
  const graph = getRuleMigrationAgent({
    model,
    inferenceClient,
    prebuiltRulesMap,
    resourceRetriever,
    integrationRetriever,
    connectorId,
    logger,
  });
  return graph.getGraphAsync();
}

async function getTranslateRuleSubGraph(logger: Logger): Promise<Drawable> {
  const model = createLlmInstance();
  const graph = getTranslateRuleGraph({
    model,
    inferenceClient,
    resourceRetriever,
    integrationRetriever,
    connectorId,
    logger,
  });
  return graph.getGraphAsync();
}

export const drawGraph = async ({
  getGraphAsync,
  outputFilename,
}: {
  getGraphAsync: (logger: Logger) => Promise<Drawable>;
  outputFilename: string;
}) => {
  const logger = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  }) as unknown as Logger;
  logger.info('Compiling graph');
  const outputPath = path.join(__dirname, outputFilename);
  const graph = await getGraphAsync(logger);
  const output = await graph.drawMermaidPng();
  const buffer = Buffer.from(await output.arrayBuffer());
  logger.info(`Writing graph to ${outputPath}`);
  await fs.writeFile(outputPath, buffer);
};

export const draw = async () => {
  await drawGraph({
    getGraphAsync: getAgentGraph,
    outputFilename: '../../docs/siem_migration/img/agent_graph.png',
  });
  await drawGraph({
    getGraphAsync: getTranslateRuleSubGraph,
    outputFilename: '../../docs/siem_migration/img/translate_rule_graph.png',
  });
};
