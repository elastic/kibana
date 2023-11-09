/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import yargs from 'yargs/yargs';
import { ToolingLog } from '@kbn/tooling-log';

export const AVAILABLE_MODELS = ['gpt-3.5', 'gpt-4'] as const;

/**
 * Work in progress developer script for evaluating models against datasets.
 *
 * Companion to the `elastic_assistant/evaluate` endpoint for running evaluations
 * in the CLI using `yarn evaluate-model`.
 *
 * TODO: Finalize inputs and call to `performEvaluation`
 */
export const evaluateModels = () => {
  const logger = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });
  logger.info('Starting model evaluator script');

  yargs(process.argv.slice(2))
    .command(
      '*',
      'Evaluate an input dataset against connectors / models + agents',
      (y) =>
        y
          .option('agents', {
            describe: 'Agents to evaluate the dataset against',
            demandOption: false,
            string: true,
          })
          .option('models', {
            describe: 'Template to use for code generation',
            default: 'gpt-3.5' as const,
            choices: AVAILABLE_MODELS,
          })
          .showHelpOnFail(false),
      (argv) => {
        // performEvaluation({ dataset: DEFAULT_DATASET, logger }).catch((err) => {
        //   logger.error(err);
        //   // eslint-disable-next-line no-process-exit
        //   process.exit(1);
        // });
      }
    )
    .parse();
};
