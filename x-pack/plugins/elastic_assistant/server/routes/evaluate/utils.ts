/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from 'langsmith';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import type { ActionResult } from '@kbn/actions-plugin/server';
import type { Logger } from '@kbn/core/server';
import { Dataset } from '../../schemas/evaluate/post_evaluate';

/**
 * Returns the LangChain `llmType` for the given connectorId/connectors
 *
 * @param connectorId
 * @param connectors
 */
export const getLlmType = (connectorId: string, connectors: ActionResult[]): string | undefined => {
  const connector = connectors.find((c) => c.id === connectorId);
  // Note: Pre-configured connectors do not have an accessible `apiProvider` field
  const apiProvider = (connector?.config?.apiProvider as string) ?? undefined;

  if (apiProvider === OpenAiProviderType.OpenAi) {
    // See: https://github.com/langchain-ai/langchainjs/blob/fb699647a310c620140842776f4a7432c53e02fa/langchain/src/agents/openai/index.ts#L185
    return 'openai';
  }
  // TODO: Add support for Amazon Bedrock Connector once merged
  // Note: Doesn't appear to be a difference between Azure and OpenAI LLM types, so TBD for functions agent on Azure
  // See: https://github.com/langchain-ai/langchainjs/blob/fb699647a310c620140842776f4a7432c53e02fa/langchain/src/llms/openai.ts#L539

  return undefined;
};

/**
 * Return connector name for the given connectorId/connectors
 *
 * @param connectorId
 * @param connectors
 */
export const getConnectorName = (
  connectorId: string,
  connectors: ActionResult[]
): string | undefined => {
  return connectors.find((c) => c.id === connectorId)?.name;
};

/**
 * Fetches a dataset from LangSmith. Note that `client` will use env vars
 *
 * @param datasetName
 * @param logger
 */
export const fetchLangSmithDataset = async (
  datasetName: string | undefined,
  logger: Logger
): Promise<Dataset> => {
  if (datasetName === undefined) {
    return [];
  }
  try {
    const client = new Client();

    const examples = [];
    for await (const example of client.listExamples({ datasetName })) {
      examples.push(example);
    }

    // Convert to internal Dataset type -- TODO: add generic support for the different LangSmith test datasets
    const dataset: Dataset = examples.map((example) => ({
      input: example.inputs.input as string,
      reference: (example.outputs?.output as string) ?? '',
      tags: [],
      prediction: undefined,
    }));

    return dataset;
  } catch (e) {
    logger.error(`Error fetching dataset from LangSmith: ${e.message}`);
    return [];
  }
};
