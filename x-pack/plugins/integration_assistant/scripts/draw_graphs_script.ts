/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';
import { ToolingLog } from '@kbn/tooling-log';
import { Graph as RunnableGraph } from '@langchain/core/runnables/graph';
import { FakeLLM } from '@langchain/core/utils/testing';
import fs from 'fs/promises';
import path from 'path';
import { getCategorizationGraph } from '../server/graphs/categorization/graph';
import { getEcsGraph, getEcsSubGraph } from '../server/graphs/ecs/graph';
import { getLogFormatDetectionGraph } from '../server/graphs/log_type_detection/graph';
import { getRelatedGraph } from '../server/graphs/related/graph';

// Some mock elements just to get the graph to compile
const model = new FakeLLM({
  response: JSON.stringify({}, null, 2),
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;
const client = 'test' as unknown as IScopedClusterClient;

const logger = new ToolingLog({
  level: 'info',
  writeTo: process.stdout,
});
logger.info('Compiling graphs');

async function saveFile(filename: string, buffer: Buffer) {
  const outputPath = path.join(__dirname, '../docs/imgs/', filename);
  logger.info(`Writing graph to ${outputPath}`);
  await fs.writeFile(outputPath, buffer);
}

async function drawGraph(compiledGraph: RunnableGraph, graphName: string) {
  const output = await compiledGraph.drawMermaidPng();
  const buffer = Buffer.from(await output.arrayBuffer());
  await saveFile(`${graphName}.png`, buffer);
}

export async function drawGraphs() {
  const relatedGraph = (await getRelatedGraph({ client, model })).getGraph();
  const logFormatDetectionGraph = (await getLogFormatDetectionGraph({ client, model })).getGraph();
  const categorizationGraph = (await getCategorizationGraph({ client, model })).getGraph();
  const ecsSubGraph = (await getEcsSubGraph({ model })).getGraph();
  const ecsGraph = (await getEcsGraph({ model })).getGraph();
  drawGraph(relatedGraph, 'related_graph');
  drawGraph(logFormatDetectionGraph, 'log_detection_graph');
  drawGraph(categorizationGraph, 'categorization_graph');
  drawGraph(ecsSubGraph, 'ecs_subgraph');
  drawGraph(ecsGraph, 'ecs_graph');
}
