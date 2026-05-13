/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { format as formatUrl } from 'url';
import Fs from 'fs/promises';
import { spawn } from 'child_process';
import { REPO_ROOT } from '@kbn/repo-info';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { getArtifactName } from '@kbn/product-doc-common';
import type { ProductName } from '@kbn/product-doc-common';
import type { FtrProviderContext } from '../ftr_provider_context';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const inferenceId = process.env.INFERENCE_ID || '.jina-embeddings-v5-text-small';
/** OpenAPI artifact builder defaults to multilingual per product-doc-artifact-builder README */
const openApiInferenceId = process.env.OPENAPI_INFERENCE_ID || '.jina-embeddings-v5-text-small';
const stackDocsVersion = process.env.STACK_DOCS_VERSION || 'latest';
const sourceClusterUrl = process.env.KIBANA_SOURCE_CLUSTER_URL;
const sourceClusterApiKey = process.env.KIBANA_SOURCE_CLUSTER_API_KEY;
const sourceClusterIndex = process.env.KIBANA_SOURCE_INDEX;

const embeddingClusterUrl = 'http://localhost:9220';
const embeddingClusterUsername = 'elastic';
const embeddingClusterPassword = 'changeme';
const MIN_ARTIFACT_SIZE_BYTES = 3 * 1024 * 1024;

const getCombinedOpenApiArtifactZipFileName = (
  stackVersion: string,
  openapiInference: string
): string => {
  const impliedElser =
    openapiInference === defaultInferenceEndpoints.ELSER ||
    openapiInference === defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID ||
    openapiInference.toLowerCase().includes('elser');
  const suffix = impliedElser ? '' : `--${openapiInference}`;
  return `kb-product-doc-openapi-${stackVersion}${suffix}.zip`;
};

const OPENAPI_SPEC_INDEX_NAMES = [
  'kibana_ai_openapi_spec_elasticsearch',
  'kibana_ai_openapi_spec_kibana',
] as const;

const LOAD_ESQL_DOCS_SCRIPT = resolve(
  REPO_ROOT,
  'x-pack/platform/plugins/shared/inference/scripts/load_esql_docs/index.js'
);

/** Connector used by load_esql_docs to enrich ES|QL docs (must exist in preconfigured connectors) */
const ESQL_DOCS_CONNECTOR_ID =
  process.env.ESQL_DOCS_CONNECTOR_ID || '.openai-gpt-4.1-chat_completion';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const es = getService('es');
  const retry = getService('retry');
  const config = getService('config');

  describe('Gen AI artifacts', function () {
    before(async () => {
      // Environment variable for EIS CCM API key (set by CI from Vault)
      const EIS_CCM_API_KEY_ENV = 'KIBANA_EIS_CCM_API_KEY';
      const eisCcmApiKey = process.env[EIS_CCM_API_KEY_ENV];

      if (!eisCcmApiKey) {
        throw new Error(
          `[EIS] ${EIS_CCM_API_KEY_ENV} is not set; skipping CCM enablement and assuming endpoints already exist`
        );
      }

      log.info('[EIS] Enabling Cloud Connected Mode...');
      await es.transport.request({
        method: 'PUT',
        path: '/_inference/_ccm',
        body: { api_key: eisCcmApiKey },
      });
      log.info('[EIS] ✅ CCM enabled');

      // Wait for EIS to provision endpoints
      log.info('[EIS] Waiting for EIS endpoints to be provisioned...');
      const maxRetries = 5;
      const retryDelayMs = 3000;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const response = await es.inference.get({ inference_id: '_all' });
        const endpoints = response.endpoints as Array<{
          inference_id?: string;
        }>;
        const presentInferenceIds = new Set(
          endpoints
            .map((ep) => ep.inference_id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
        );
        const requiredInferenceIds = [...new Set([inferenceId, openApiInferenceId])];
        const missingInferenceIds = requiredInferenceIds.filter(
          (id) => !presentInferenceIds.has(id)
        );

        if (missingInferenceIds.length === 0) {
          log.info(
            `[EIS] ✅ Found inference endpoints for: ${requiredInferenceIds.join(
              ', '
            )} (attempt ${attempt})`
          );
          return;
        }
        if (attempt < maxRetries) {
          log.info(
            `[EIS] Missing inference endpoints: ${missingInferenceIds.join(
              ', '
            )} (attempt ${attempt}/${maxRetries}), waiting...`
          );

          await sleep(retryDelayMs);
        }
      }

      throw new Error(
        `[EIS] Required inference endpoints not all present after ${maxRetries} attempts (need ${inferenceId} and ${openApiInferenceId}). Failing fast before artifact generation.`
      );
    });

    describe('updates ES|QL docs with LLM enrichment', function () {
      this.timeout(120 * 60 * 1000);
      const nodeBin = process.execPath;

      it(`runs load_esql_docs with connectorId=${ESQL_DOCS_CONNECTOR_ID}`, async function () {
        const kibanaUrl = formatUrl(config.get('servers.kibana'));
        const esUrl = formatUrl(config.get('servers.elasticsearch'));

        const loadEsqlDocsArgs = [
          LOAD_ESQL_DOCS_SCRIPT,
          `--connectorId=${ESQL_DOCS_CONNECTOR_ID}`,
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

    describe('generates product docs artifact with EIS enabled', function () {
      this.timeout(340 * 60 * 1000);
      const scriptsDir = resolve(REPO_ROOT, 'scripts');
      const nodeBin = process.execPath;
      const kbArtifactsDir = resolve(REPO_ROOT, 'build', 'kb-artifacts');

      const waitForArtifactZipAtPath = async (artifactPath: string) => {
        await retry.waitForWithTimeout(
          `Artifact zip [${artifactPath}] should exist`,
          30 * 60 * 1000, // 30 minutes
          async () => {
            try {
              await Fs.access(artifactPath);
              return true;
            } catch {
              return false;
            }
          }
        );

        const stats = await Fs.stat(artifactPath);
        if (stats.size < MIN_ARTIFACT_SIZE_BYTES) {
          throw new Error(
            `Artifact zip '[${artifactPath}]' exists but is too small (${stats.size} bytes); expected at least ${MIN_ARTIFACT_SIZE_BYTES} bytes (failing immediately)`
          );
        }

        log.info(
          `Artifact zip [${artifactPath}] size check passed (${stats.size} bytes >= ${MIN_ARTIFACT_SIZE_BYTES} bytes)`
        );
      };

      const baseArgs = [
        resolve(scriptsDir, 'build_product_doc_artifacts.js'),
        `--stack-version=${stackDocsVersion}`,
        `--inference-id=${inferenceId}`,
        `--sourceClusterUrl=${sourceClusterUrl}`,
        `--sourceClusterApiKey=${sourceClusterApiKey}`,
        `--sourceClusterIndex=${sourceClusterIndex}`,
        `--embeddingClusterUrl=${embeddingClusterUrl}`,
        `--embeddingClusterUsername=${embeddingClusterUsername}`,
        `--embeddingClusterPassword=${embeddingClusterPassword}`,
      ];

      const commands = [
        [...baseArgs, '--product-name=kibana'],
        [...baseArgs, '--product-name=elasticsearch'],
        [...baseArgs, '--product-name=observability'],
        [...baseArgs, '--product-name=security'],
      ];

      const waitForProductDocIndex = async (productName: string) => {
        const indexName = `.kibana_ai_product_doc_${productName}-${inferenceId}`;

        await retry.waitForWithTimeout(
          `Elasticsearch index [${indexName}] should exist`,
          5 * 60 * 1000,
          async () => {
            if (await es.indices.exists({ index: indexName })) {
              return true;
            }

            throw new Error(`Expected Elasticsearch index '[${indexName}]' to exist.`);
          }
        );
      };

      const waitForArtifactZip = async (productName: ProductName) => {
        const artifactName = getArtifactName({
          productName,
          productVersion: stackDocsVersion,
          inferenceId,
        });
        const artifactPath = resolve(kbArtifactsDir, artifactName);
        await waitForArtifactZipAtPath(artifactPath);
      };

      const waitForOpenApiSpecIndices = async () => {
        for (const indexName of OPENAPI_SPEC_INDEX_NAMES) {
          await retry.waitForWithTimeout(
            `Elasticsearch index [${indexName}] should exist`,
            5 * 60 * 1000,
            async () => {
              if (await es.indices.exists({ index: indexName })) {
                return true;
              }

              throw new Error(`Expected Elasticsearch index '[${indexName}]' to exist.`);
            }
          );
        }
      };

      it(`builds product doc artifacts for inference_id=${inferenceId}`, async () => {
        for (const args of commands) {
          const cmd = `${nodeBin} ${args.join(' ')}`;
          log.info(`Running product doc artifact build: ${cmd}`);

          const productNameArg = args.find((arg) => arg.startsWith('--product-name='));
          const productName = productNameArg?.split('=')[1] as ProductName | undefined;

          await new Promise<void>((resolvePromise, rejectPromise) => {
            const child = spawn(nodeBin, args, {
              cwd: REPO_ROOT,
              stdio: 'inherit',
              env: process.env,
            });

            child.on('exit', async (code: number | null) => {
              if (code === 0) {
                resolvePromise();
                return;
              }

              if (!productName) {
                rejectPromise(new Error(`Command failed with exit code ${code}: ${cmd}`));
                return;
              }

              log.warning(
                `Command exited with code ${code} for product [${productName}]. Waiting for index to be ready before failing.`
              );

              try {
                await waitForProductDocIndex(productName);
                log.info(
                  `Index for product [${productName}] became available despite non-zero exit code ${code}`
                );
                resolvePromise();
              } catch (err) {
                rejectPromise(
                  new Error(
                    `Command failed with exit code ${code} and index for product [${productName}] did not become ready: ${cmd}. Underlying error: ${
                      (err as Error).message
                    }`
                  )
                );
              }
            });

            child.on('error', (err: Error) => {
              rejectPromise(err);
            });
          });

          if (productName) {
            await waitForArtifactZip(productName);
          }
        }
      });

      it(`builds OpenAPI spec artifacts for inference_id=${openApiInferenceId}`, async () => {
        const openApiArgs = [
          resolve(scriptsDir, 'build_openapi_artifacts.js'),
          `--stack-version=${stackDocsVersion}`,
          `--embedding-cluster-url=${embeddingClusterUrl}`,
          `--embedding-cluster-username=${embeddingClusterUsername}`,
          `--embedding-cluster-password=${embeddingClusterPassword}`,
          `--inference-id=${openApiInferenceId}`,
        ];

        const cmd = `${nodeBin} ${openApiArgs.join(' ')}`;
        log.info(`Running OpenAPI artifact build: ${cmd}`);

        await new Promise<void>((resolvePromise, rejectPromise) => {
          const child = spawn(nodeBin, openApiArgs, {
            cwd: REPO_ROOT,
            stdio: 'inherit',
            env: process.env,
          });

          child.on('exit', async (code: number | null) => {
            if (code === 0) {
              resolvePromise();
              return;
            }

            log.warning(
              `OpenAPI build exited with code ${code}. Waiting for OpenAPI spec indices before failing.`
            );

            try {
              await waitForOpenApiSpecIndices();
              log.info(`OpenAPI spec indices became available despite non-zero exit code ${code}`);
              resolvePromise();
            } catch (err) {
              rejectPromise(
                new Error(
                  `OpenAPI build failed with exit code ${code} and spec indices did not become ready: ${cmd}. Underlying error: ${
                    (err as Error).message
                  }`
                )
              );
            }
          });

          child.on('error', (err: Error) => {
            rejectPromise(err);
          });
        });

        const openApiZipName = getCombinedOpenApiArtifactZipFileName(
          stackDocsVersion,
          openApiInferenceId
        );
        // waits for zip, then asserts size >= MIN_ARTIFACT_SIZE_BYTES (see waitForArtifactZipAtPath)
        await waitForArtifactZipAtPath(resolve(kbArtifactsDir, openApiZipName));
      });
    });
  });
}
