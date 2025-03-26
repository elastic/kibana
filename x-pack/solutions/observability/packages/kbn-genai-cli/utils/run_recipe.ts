/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/core/server';
import { run } from '@kbn/dev-cli-runner';
import { createInferenceClient, InferenceCliClient } from '@kbn/inference-cli';
import { createKibanaClient, KibanaClient } from '@kbn/kibana-api-cli';
import { ToolingLog } from '@kbn/tooling-log';
import { toolingLogToLogger } from './tooling_log_to_logger';

type RunRecipeCallback = (options: {
  inferenceClient: InferenceCliClient;
  kibanaClient: KibanaClient;
  log: ToolingLog;
  logger: Logger;
  signal: AbortSignal;
}) => Promise<void>;

export function runRecipe(callback: RunRecipeCallback) {
  run(
    async ({ log, addCleanupTask, flags }) => {
      const controller = new AbortController();
      const signal = controller.signal;

      addCleanupTask(() => {
        controller.abort();
      });

      const kibanaClient = await createKibanaClient({ log, signal });

      const inferenceClient = await createInferenceClient({
        log,
        signal,
        kibanaClient,
      });

      return await callback({
        inferenceClient,
        kibanaClient,
        log,
        signal,
        logger: toolingLogToLogger({ flags, log }),
      });
    },
    {
      flags: {},
    }
  );
}
