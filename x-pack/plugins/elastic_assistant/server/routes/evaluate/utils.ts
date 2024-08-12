/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from 'langsmith';
import type { ActionResult } from '@kbn/actions-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { Run } from 'langsmith/schemas';
import { ToolingLog } from '@kbn/tooling-log';
import { Dataset } from '@kbn/elastic-assistant-common';
import { isLangSmithEnabled } from '@kbn/langchain/server/tracers/langsmith';

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
  if (datasetName === undefined || !isLangSmithEnabled()) {
    throw new Error('LangSmith dataset name not provided or LangSmith not enabled');
  }

  try {
    const client = new Client();

    const examples = [];
    for await (const example of client.listExamples({ datasetName })) {
      examples.push(example);
    }

    // Convert to internal Dataset type -- TODO: add generic support for the different LangSmith test dataset formats
    const dataset: Dataset = examples.map((example) => ({
      id: example.id,
      input: example.inputs.input as string,
      reference: (example.outputs?.output as string) ?? '',
      tags: [], // TODO: Consider adding tags from example data, e.g.: `datasetId:${example.dataset_id}`, `exampleName:${example.name}`
      prediction: undefined,
    }));

    return dataset;
  } catch (e) {
    logger.error(`Error fetching dataset from LangSmith: ${e.message}`);
    return [];
  }
};

/**
 * Write Feedback to LangSmith for a given Run
 *
 * @param run
 * @param evaluationId
 * @param logger
 */
export const writeLangSmithFeedback = async (
  run: Run,
  evaluationId: string,
  logger: Logger | ToolingLog
): Promise<string> => {
  try {
    const client = new Client();
    const feedback = {
      score: run.feedback_stats?.score,
      value: run.feedback_stats?.value,
      correction: run.feedback_stats?.correction,
      comment: run.feedback_stats?.comment,
      sourceInfo: run.feedback_stats?.sourceInfo,
      feedbackSourceType: run.feedback_stats?.feedbackSourceType,
      sourceRunId: run.feedback_stats?.sourceRunId,
      feedbackId: run.feedback_stats?.feedbackId,
      eager: run.feedback_stats?.eager,
    };
    await client.createFeedback(run.id, evaluationId, feedback);
    const runUrl = await client.getRunUrl({ run });
    return runUrl;
  } catch (e) {
    logger.error(`Error writing feedback to LangSmith: ${e.message}`);
    return '';
  }
};
