/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { ToolingLog } from '@kbn/tooling-log';
import { evaluationIndexMappings as mappings } from './mappings';
import { EvaluationResult, EvaluationSummary } from '../evaluation';

interface SetupIndexParams {
  esClient: ElasticsearchClient;
  index: string;
  logger: Logger | ToolingLog;
}

/**
 * Sets up the output index for the model evaluator. Creates index with mappings
 * if not already exists
 *
 * @param {Object} options - The options object.
 * @param {ElasticsearchClient} options.esClient Elasticsearch client
 * @param {string} options.index Name of the output index
 *
 * @returns {Promise<boolean>} True if index exists or created successfully
 */
export const setupEvaluationIndex = async ({
  esClient,
  index,
  logger,
}: SetupIndexParams): Promise<boolean> => {
  // Check if index exists
  const indexExists = await esClient.indices.exists({ index });
  if (indexExists) {
    logger.info(`Index "${index}" already exists`);
    return true;
  }

  // Create index with default eval mappings if not exists
  const settings = {};
  const response = await esClient.indices.create({
    index,
    mappings,
    settings,
  });

  if (response.acknowledged) {
    logger.info(`Created index "${index}"`);
  } else {
    logger.error(`Error creating index "${index}"`);
  }

  return response.acknowledged;
};

interface IndexEvaluationsParams {
  esClient: ElasticsearchClient;
  evaluationResults: EvaluationResult[];
  evaluationSummary: EvaluationSummary;
  index: string;
  logger: Logger | ToolingLog;
}

/**
 * Indexes evaluation results into the output index
 * @param {Object} options - The options object.
 * @param {ElasticsearchClient} options.esClient Elasticsearch client
 * @param {EvaluationResult[]} options.evaluationResults Individual eval results
 * @param {EvaluationResult[]} options.evaluationSummary Summary of eval
 * @param {string} options.index Name of the output index
 *
 * @returns {Promise<boolean>} True if documents created successfully
 */
export const indexEvaluations = async ({
  esClient,
  evaluationResults,
  evaluationSummary,
  index,
  logger,
}: IndexEvaluationsParams): Promise<boolean> => {
  try {
    const response = await esClient.helpers.bulk({
      datasource: evaluationResults,
      onDocument(doc) {
        return { index: { _index: index } };
      },
    });

    logger.info(`Writing evaluations...`);
    logger.info(`Evaluations bulk index response:\n${JSON.stringify(response)}`);

    logger.info(`Writing summary...`);
    const summaryResponse = await esClient.index({ index, document: evaluationSummary });
    logger.info(`Summary index response:\n${JSON.stringify(summaryResponse)}`);

    return true;
  } catch (e) {
    logger.error(`Error indexing data into the evaluation index\n${e}`);
    return false;
  }
};
