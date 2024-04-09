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
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { Dataset } from '@kbn/elastic-assistant-common';

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
    const lcTracer = new LangChainTracer({
      projectName: projectName ?? getLangSmithDefaultProject(), // Shows as the 'test' run's 'name' in langsmith ui
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

/**
 * Returns the default LangSmith project as defined in env vars. This is LangSmith's default way of storing
 * configuration. See https://github.com/elastic/kibana/pull/180227 for storage of configuration in sessionStorage
 */
export const getLangSmithDefaultProject = (): string => {
  const defaultProject = 'default';
  try {
    return typeof process !== 'undefined'
      ? process.env?.LANGCHAIN_PROJECT ?? defaultProject
      : defaultProject;
  } catch (e) {
    return defaultProject;
  }
};
