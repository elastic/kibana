/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { format as formatUrl } from 'url';
import { spawn } from 'child_process';
import { REPO_ROOT } from '@kbn/repo-info';
import type { FtrProviderContext } from '../ftr_provider_context';
import { ensureEisEndpoints } from './ensure_eis';

const LOAD_ESQL_DOCS_SCRIPT = resolve(
  REPO_ROOT,
  'x-pack/platform/plugins/shared/inference/scripts/load_esql_docs/index.js'
);

/** Inference endpoint used by load_esql_docs to enrich ES|QL docs. */
const ESQL_DOCS_INFERENCE_ID =
  process.env.ESQL_DOCS_INFERENCE_ID ||
  process.env.ESQL_DOCS_CONNECTOR_ID ||
  '.openai-gpt-5.5-chat_completion';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const es = getService('es');
  const config = getService('config');

  describe('Gen AI ES|QL docs sync', function () {
    before(async () => {
      await ensureEisEndpoints({
        es,
        log,
        requiredInferenceIds: [ESQL_DOCS_INFERENCE_ID],
      });
    });

    describe('updates ES|QL docs with LLM enrichment', function () {
      this.timeout(120 * 60 * 1000);
      const nodeBin = process.execPath;

      it(`runs load_esql_docs with inferenceId=${ESQL_DOCS_INFERENCE_ID}`, async function () {
        const kibanaUrl = formatUrl(config.get('servers.kibana'));
        const esUrl = formatUrl(config.get('servers.elasticsearch'));

        const loadEsqlDocsArgs = [
          LOAD_ESQL_DOCS_SCRIPT,
          `--inferenceId=${ESQL_DOCS_INFERENCE_ID}`,
          `--kibana=${kibanaUrl}`,
          `--elasticsearch=${esUrl}`,
        ];

        const cmd = `${nodeBin} ${loadEsqlDocsArgs.join(' ')}`;
        log.info(`Running load ES|QL docs: ${cmd}`);

        await new Promise<void>((resolvePromise, rejectPromise) => {
          const child = spawn(nodeBin, loadEsqlDocsArgs, {
            cwd: REPO_ROOT,
            stdio: 'inherit',
            env: process.env,
          });

          child.on('exit', (code: number | null) => {
            if (code === 0) {
              resolvePromise();
              return;
            }
            rejectPromise(new Error(`load_esql_docs exited with code ${code}: ${cmd}`));
          });

          child.on('error', (err: Error) => {
            rejectPromise(err);
          });
        });
      });
    });
  });
}
