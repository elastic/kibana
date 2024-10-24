/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLangSmithEnabled } from '@kbn/langchain/server/tracers/langsmith';
import { Client, Example } from 'langsmith';
import type { Logger } from '@kbn/core/server';

export function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function generateUniqueId() {
  return `${Date.now() + Math.floor(Math.random() * 1e13)}`;
}

/**
 * Fetches a dataset from LangSmith. Note that `client` will use env vars unless langSmithApiKey is specified
 *
 * @param datasetName
 * @param logger
 * @param langSmithApiKey
 */
export const fetchLangSmithDataset = async (
  datasetName: string | undefined,
  logger: Logger,
  langSmithApiKey?: string
): Promise<Example[]> => {
  if (datasetName === undefined || (langSmithApiKey == null && !isLangSmithEnabled())) {
    throw new Error('LangSmith dataset name not provided or LangSmith not enabled');
  }

  try {
    const client = new Client();

    const examples = [];
    for await (const example of client.listExamples({ datasetName })) {
      examples.push(example);
    }

    return examples;
  } catch (e) {
    logger.error(`Error fetching dataset from LangSmith: ${e.message}`);
    return [];
  }
};
