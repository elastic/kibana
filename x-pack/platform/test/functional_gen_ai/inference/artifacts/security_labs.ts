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
import {
  getSecurityLabsArtifactName,
  getSecurityLabsUtcTimestampVersion,
} from '@kbn/product-doc-common';
import type { FtrProviderContext } from '../ftr_provider_context';
import { ensureEisEndpoints } from './ensure_eis';

/** Security Labs artifacts are built for both ELSER (local ES) and Jina (EIS). */
const SECURITY_LABS_ELSER_INFERENCE_ID = defaultInferenceEndpoints.ELSER;
const SECURITY_LABS_JINA_INFERENCE_ID = defaultInferenceEndpoints.JINAv5;

const embeddingClusterUrl = 'http://localhost:9220';
const embeddingClusterUsername = 'elastic';
const embeddingClusterPassword = 'changeme';

/** Security Labs corpus (~170 markdown articles) is far smaller than product docs. */
const SECURITY_LABS_MIN_ARTIFACT_SIZE_BYTES = 100 * 1024;

/** Shared across ELSER + Jina builds in this suite so both zips share one version. */
const securityLabsVersion =
  process.env.SECURITY_LABS_VERSION || getSecurityLabsUtcTimestampVersion();

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const log = getService('log');
  const es = getService('es');
  const retry = getService('retry');

  describe('Gen AI security labs artifacts', function () {
    this.timeout(180 * 60 * 1000);
    const scriptsDir = resolve(REPO_ROOT, 'scripts');
    const nodeBin = process.execPath;
    const kbArtifactsDir = resolve(REPO_ROOT, 'build', 'kb-artifacts');

    const waitForSecurityLabsArtifact = async (securityLabsInferenceId: string) => {
      const artifactName = getSecurityLabsArtifactName({
        version: securityLabsVersion,
        inferenceId: securityLabsInferenceId,
      });
      const artifactPath = resolve(kbArtifactsDir, artifactName);

      await retry.waitForWithTimeout(
        `Security Labs artifact zip [${artifactPath}] should exist`,
        5 * 60 * 1000,
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
      if (stats.size < SECURITY_LABS_MIN_ARTIFACT_SIZE_BYTES) {
        throw new Error(
          `Security Labs artifact zip [${artifactPath}] exists but is too small (${stats.size} bytes); expected at least ${SECURITY_LABS_MIN_ARTIFACT_SIZE_BYTES} bytes`
        );
      }

      log.info(
        `Security Labs artifact zip [${artifactPath}] size check passed (${stats.size} bytes)`
      );
    };

    const buildSecurityLabsArtifact = async (securityLabsInferenceId: string) => {
      const args = [
        resolve(scriptsDir, 'build_security_labs_artifact.js'),
        `--artifactVersion=${securityLabsVersion}`,
        `--inferenceId=${securityLabsInferenceId}`,
        `--targetFolder=${kbArtifactsDir}`,
        `--embeddingClusterUrl=${embeddingClusterUrl}`,
        `--embeddingClusterUsername=${embeddingClusterUsername}`,
        `--embeddingClusterPassword=${embeddingClusterPassword}`,
      ];

      const cmd = `${nodeBin} ${args.join(' ')}`;
      log.info(`Running Security Labs artifact build: ${cmd}`);

      await new Promise<void>((resolvePromise, rejectPromise) => {
        const child = spawn(nodeBin, args, {
          cwd: REPO_ROOT,
          stdio: 'inherit',
          // Inherit env so GITHUB_TOKEN / SECURITY_LABS_REPO_REF reach the fetch step.
          env: process.env,
        });

        child.on('exit', (code: number | null) => {
          if (code === 0) {
            resolvePromise();
            return;
          }
          rejectPromise(new Error(`Command failed with exit code ${code}: ${cmd}`));
        });

        child.on('error', (err: Error) => {
          rejectPromise(err);
        });
      });
    };

    it(`builds security labs artifact for inference_id=${SECURITY_LABS_ELSER_INFERENCE_ID} (local ES)`, async () => {
      await buildSecurityLabsArtifact(SECURITY_LABS_ELSER_INFERENCE_ID);
      await waitForSecurityLabsArtifact(SECURITY_LABS_ELSER_INFERENCE_ID);
    });

    describe('Jina (EIS)', () => {
      before(async () => {
        // Only Jina requires EIS; keep this out of the suite-level before() so a CCM/Jina
        // failure cannot block the local ELSER artifact build.
        await ensureEisEndpoints({
          es,
          log,
          requiredInferenceIds: [SECURITY_LABS_JINA_INFERENCE_ID],
        });
      });

      it(`builds security labs artifact for inference_id=${SECURITY_LABS_JINA_INFERENCE_ID} (EIS)`, async () => {
        await buildSecurityLabsArtifact(SECURITY_LABS_JINA_INFERENCE_ID);
        await waitForSecurityLabsArtifact(SECURITY_LABS_JINA_INFERENCE_ID);
      });
    });
  });
}
