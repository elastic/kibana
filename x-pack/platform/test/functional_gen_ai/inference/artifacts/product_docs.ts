/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import Fs from 'fs/promises';
import { spawn } from 'child_process';
import { REPO_ROOT } from '@kbn/repo-info';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { getArtifactName } from '@kbn/product-doc-common';
import type { ProductName } from '@kbn/product-doc-common';
import type { FtrProviderContext } from '../ftr_provider_context';
import { ensureEisEndpoints } from './ensure_eis';

interface ProductDocArtifactModel {
  label: string;
  inferenceId: string;
  openApiInferenceId: string;
}

/**
 * CI runs this suite once per model (Jina and ELSER on EIS) via FTR configs that
 * set INFERENCE_ID. A direct run with no override builds both.
 */
const artifactModels: ProductDocArtifactModel[] = process.env.INFERENCE_ID
  ? [
      {
        label: process.env.INFERENCE_ID,
        inferenceId: process.env.INFERENCE_ID,
        openApiInferenceId: process.env.OPENAPI_INFERENCE_ID || process.env.INFERENCE_ID,
      },
    ]
  : [
      {
        label: 'Jina',
        inferenceId: defaultInferenceEndpoints.JINAv5,
        openApiInferenceId: defaultInferenceEndpoints.JINAv5,
      },
      {
        label: 'ELSER on EIS',
        inferenceId: defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
        openApiInferenceId: defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID,
      },
    ];

const requestedStackDocsVersion = process.env.STACK_DOCS_VERSION || 'latest';
const sourceClusterUrl = process.env.KIBANA_SOURCE_CLUSTER_URL;
const sourceClusterApiKey = process.env.KIBANA_SOURCE_CLUSTER_API_KEY;
const sourceClusterIndex = process.env.KIBANA_SOURCE_INDEX;

const embeddingClusterUrl = 'http://localhost:9220';
const embeddingClusterUsername = 'elastic';
const embeddingClusterPassword = 'changeme';
const MIN_ARTIFACT_SIZE_BYTES = 4 * 1024 * 1024;
const MIN_OPENAPI_ARTIFACT_SIZE_BYTES = 2 * 1024 * 1024;

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

/** `/api/status` version.number is `9.6.0`; artifact names use `9.6`. */
const majorMinorStackVersion = (version: string): string => {
  const [major, minor] = version.split('.');
  if (!major || minor === undefined || minor === '') {
    throw new Error(`unable to read a stack version from [${version}]`);
  }
  return `${major}.${minor}`;
};

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const es = getService('es');
  const retry = getService('retry');
  const supertest = getService('supertest');

  describe('Gen AI product docs artifacts', function () {
    let stackDocsVersion = requestedStackDocsVersion;

    before(async () => {
      if (stackDocsVersion !== 'current') {
        return;
      }

      const { body } = await supertest.get('/api/status').set('kbn-xsrf', 'kibana').expect(200);
      const versionNumber = body?.version?.number;
      if (typeof versionNumber !== 'string' || versionNumber.length === 0) {
        throw new Error(`unable to get stack version from '/api/status': ${JSON.stringify(body)}`);
      }

      stackDocsVersion = majorMinorStackVersion(versionNumber);
      log.info(`Stack docs version from /api/status: ${versionNumber} -> ${stackDocsVersion}`);
    });

    for (const model of artifactModels) {
      describe(`${model.label} (${model.inferenceId})`, function () {
        before(async () => {
          await ensureEisEndpoints({
            es,
            log,
            requiredInferenceIds: [model.inferenceId, model.openApiInferenceId],
          });
        });

        describe('generates product docs artifact with EIS enabled', function () {
          this.timeout(340 * 60 * 1000);
          const scriptsDir = resolve(REPO_ROOT, 'scripts');
          const nodeBin = process.execPath;
          const kbArtifactsDir = resolve(REPO_ROOT, 'build', 'kb-artifacts');
          const { inferenceId, openApiInferenceId } = model;

          const waitForArtifactZipAtPath = async (
            artifactPath: string,
            minSizeBytes: number = MIN_ARTIFACT_SIZE_BYTES
          ) => {
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
            if (stats.size < minSizeBytes) {
              throw new Error(
                `Artifact zip '[${artifactPath}]' exists but is too small (${stats.size} bytes); expected at least ${minSizeBytes} bytes (failing immediately)`
              );
            }

            log.info(
              `Artifact zip [${artifactPath}] size check passed (${stats.size} bytes >= ${minSizeBytes} bytes)`
            );
          };

          // Built when the test runs so STACK_DOCS_VERSION=current can be replaced
          // with the version from /api/status in the parent before() hook.
          const getBaseArgs = () => [
            resolve(scriptsDir, 'build_product_doc_artifacts.js'),
            `--stack-version=${stackDocsVersion}`,
            `--inference-id=${inferenceId}`,
            `--sourceClusterUrl=${sourceClusterUrl}`,
            `--sourceClusterApiKey=${sourceClusterApiKey}`,
            `--sourceClusterIndex=${sourceClusterIndex}`,
            `--embeddingClusterUrl=${embeddingClusterUrl}`,
            `--embeddingClusterUsername=${embeddingClusterUsername}`,
            `--embeddingClusterPassword=${embeddingClusterPassword}`,
            // Match security_labs.ts: pin output so CI upload finds zips under build/kb-artifacts
            `--targetFolder=${kbArtifactsDir}`,
          ];

          const getCommands = () =>
            ['kibana', 'elasticsearch', 'observability', 'security'].map((productName) => [
              ...getBaseArgs(),
              `--product-name=${productName}`,
            ]);

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
            for (const args of getCommands()) {
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
              `--targetFolder=${kbArtifactsDir}`,
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
                  log.info(
                    `OpenAPI spec indices became available despite non-zero exit code ${code}`
                  );
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
            await waitForArtifactZipAtPath(
              resolve(kbArtifactsDir, openApiZipName),
              MIN_OPENAPI_ARTIFACT_SIZE_BYTES
            );
          });
        });
      });
    }
  });
}
