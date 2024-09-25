/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs/promises';
import path from 'path';
import {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';
import type { Logger } from '@kbn/logging';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { FakeLLM } from '@langchain/core/utils/testing';
import { createOpenAIFunctionsAgent } from 'langchain/agents';
import { getDefaultAssistantGraph } from '../server/lib/langchain/graphs/default_assistant_graph/graph';

// Just defining some test variables to get the graph to compile..
const testPrompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are a helpful assistant'],
  ['placeholder', '{chat_history}'],
  ['human', '{input}'],
  ['placeholder', '{agent_scratchpad}'],
]);

const mockLlm = new FakeLLM({
  response: JSON.stringify({}, null, 2),
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

const createLlmInstance = () => {
  return mockLlm;
};

async function getGraph(logger: Logger) {
  const agentRunnable = await createOpenAIFunctionsAgent({
    llm: mockLlm,
    tools: [],
    prompt: testPrompt,
    streamRunnable: false,
  });
  const graph = getDefaultAssistantGraph({
    agentRunnable,
    logger,
    createLlmInstance,
    tools: [],
    replacements: {},
  });
  return graph.getGraph();
}

export const draw = async () => {
  const logger = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  }) as unknown as Logger;
  logger.info('Compiling graph');
  const outputPath = path.join(__dirname, '../docs/img/default_assistant_graph.png');
  const graph = await getGraph(logger);
  const output = await graph.drawMermaidPng();
  const buffer = Buffer.from(await output.arrayBuffer());
  logger.info(`Writing graph to ${outputPath}`);
  await fs.writeFile(outputPath, buffer);
};
