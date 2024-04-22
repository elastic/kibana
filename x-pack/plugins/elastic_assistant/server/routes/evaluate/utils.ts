/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client, Dataset as LangSmithDataset } from 'langsmith';
import type { ActionResult } from '@kbn/actions-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { Run } from 'langsmith/schemas';
import { ToolingLog } from '@kbn/tooling-log';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { Dataset } from '@kbn/elastic-assistant-common';
import { PostDataset } from '@kbn/elastic-assistant-common/impl/schemas';

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

    console.log('examples', JSON.stringify(examples, null, 2));
    // Convert to internal Dataset type -- TODO: add generic support for the different LangSmith test dataset formats
    const dataset: Dataset = examples.map((example) => ({
      id: example.id,
      input: (example.inputs.input ?? example.inputs.question) as string,
      reference: ((example.outputs?.output ?? example.outputs?.answer) as string) ?? '',
      tags: [example.dataset_id], // TODO: Consider adding tags from example data, e.g.: `datasetId:${example.dataset_id}`, `exampleName:${example.name}`
      prediction: undefined,
    }));

    return dataset;
  } catch (e) {
    logger.error(`Error fetching dataset from LangSmith: ${e.message}`);
    return [];
  }
};

/**
 * Fetches a list of LangSmith datasets
 *
 * @param logger
 */
export const getLangSmithDatasets = async ({
  logger,
}: {
  logger: Logger | ToolingLog;
}): Promise<string[]> => {
  try {
    const client = new Client();
    const asyncIterable = await client.listDatasets();
    const datasets: LangSmithDataset[] = [];

    for await (const item of asyncIterable) {
      datasets.push(item);
    }

    return datasets.map((d) => d.name);
  } catch (e) {
    logger.error(`Error fetching datasets from LangSmith: ${e.message}`);
    return [];
  }
};

/**
 * Adds messages to LangSmith dataset. Creates dataset if it doesn't already exist.
 * Note that `client` will use env vars
 *
 * @param datasetId
 * @param messages
 * @param logger
 */
export const addToLangSmithDataset = async ({
  dataset,
  datasetId,
  logger,
}: {
  dataset: PostDataset;
  datasetId: string;
  logger: Logger;
}): Promise<string | undefined> => {
  if (!isLangSmithEnabled()) {
    throw new Error('LangSmith  not enabled');
  }

  try {
    const client = new Client();

    let lsDataset: LangSmithDataset | undefined;
    const lsDatasets = [];
    for await (const d of client.listDatasets({ datasetName: datasetId })) {
      lsDatasets.push(d);
    }

    if (lsDatasets.length > 0) {
      lsDataset = lsDatasets[0];
    } else {
      lsDataset = await client.createDataset(datasetId);
    }

    console.log('lsDatasets:', JSON.stringify(lsDatasets, null, 2));
    console.log('lsDataset:', JSON.stringify(lsDataset, null, 2));

    for (const { input, reference } of dataset) {
      await client.createExample(
        { question: input.replace(/^\s*/g, '') },
        { answer: reference },
        {
          datasetId: lsDataset.id,
        }
      );
    }

    return lsDataset?.id;
  } catch (e) {
    logger.error(`Error adding to LangSmith dataset: ${e.message}`);
    return undefined;
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
  console.log('writeLangSmithFeedback');
  console.log('run', JSON.stringify(run, null, 2));
  console.log('evaluationId', evaluationId);

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
    const feedbackResponse = await client.createFeedback(run.id, evaluationId, feedback);
    console.log('feedback', JSON.stringify(feedback, null, 2));
    console.log('feedbackResponse', JSON.stringify(feedbackResponse, null, 2));
    const runUrl = await client.getRunUrl({ runId: run.id });
    return runUrl;
  } catch (e) {
    logger.error(`Error writing feedback to LangSmith: ${e.message}`);
    return '';
  }
};

/**
 * Returns a custom LangChainTracer which adds the `exampleId` so Dataset 'Test' runs are written to LangSmith
 * If `exampleId` is present (and a corresponding example exists in LangSmith) trace is written to the Dataset's `Tests`
 * section, otherwise it is written to the `Project` provided
 *
 * @param apiKey API Key for LangSmith (will fetch from env vars if not provided)
 * @param projectName Name of project to trace results to
 * @param exampleId Dataset exampleId to associate trace with
 * @param logger
 */
export const getLangSmithTracer = ({
  apiKey,
  projectName,
  exampleId,
  logger,
}: {
  apiKey?: string;
  projectName?: string;
  exampleId?: string;
  logger: Logger | ToolingLog;
}): LangChainTracer[] => {
  try {
    if (!isLangSmithEnabled() && apiKey == null) {
      return [];
    }
    console.log('getLangSmithTracer');
    console.log('projectName', projectName);
    console.log('exampleId', exampleId);

    const lcTracer = new LangChainTracer({
      projectName, // Shows as the 'test' run's 'name' in langsmith ui
      exampleId,
      client: new Client({ apiKey }),
    });

    return [lcTracer];
  } catch (e) {
    // Note: creating a tracer can fail if the LangSmith env vars are not set correctly
    logger.error(`Error creating LangSmith tracer: ${e.message}`);
  }

  return [];
};

/**
 * Returns true if LangSmith/tracing is enabled
 */
export const isLangSmithEnabled = (): boolean => {
  try {
    // Just checking if apiKey is available, if better way to check for enabled that is not env var please update
    const config = Client.getDefaultClientConfig();
    return config.apiKey != null;
  } catch (e) {
    return false;
  }
};
